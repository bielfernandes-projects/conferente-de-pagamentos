// Fumaça da página gerada (saida/index.html): renderiza cada aba num DOM falso e procura quebra ou texto de dado ausente.
// Não substitui olhar a página (os 3 erros de hoje só apareceram vendo), mas pega regressão básica. Pula se a página não foi gerada.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const arq = path.join(__dirname, "..", "saida", "index.html");
const html = fs.existsSync(arq) ? fs.readFileSync(arq, "utf8") : null;
const src = html && html.match(/<script>([\s\S]*)<\/script>/)[1];
const D = html && eval("(" + src.match(/const D = (.*);\n/)[1] + ")");

const dias = html ? [...new Set(D.lotes.map((l) => l.data))].sort() : [];       // ["2026-11-03", ..., "2026-11-10"]
const doc0 = () => { const els = {}; return { getElementById: (id) => (els[id] = els[id] || { innerHTML: "", querySelectorAll: () => [] }), querySelectorAll: () => [] }; };
const win = { scrollTo() {}, scrollY: 0 };
// roda o script da página; `aba` força o dia aberto (null = comportamento padrão); `marcado` simula os passos já marcados no navegador
// No navegador, o código dos e-mails se registra em window.Emails (global). Aqui, sem navegador, expomos o mesmo nome.
const preparar = (code) => code.replace('})(typeof module !== "undefined" ? module.exports : window);', '})(typeof module !== "undefined" ? module.exports : window);\nvar Emails = window.Emails;');
function renderizaCom(aba, getItem, win2 = { scrollTo() {}, scrollY: 0 }) {
  let code = preparar(src.replace(/\{ const h = decodeURIComponent.*\r?\n/, "").replace(/render\(\);\s*$/, ""));
  if (aba) code = code.replace(/let atual = .*\r?\n/, `let atual = "${aba}";\n`);
  const doc = doc0();
  new Function("document", "localStorage", "location", "window", code + ";render();globalThis.__h = document.getElementById('app').innerHTML;")(doc, { getItem, setItem() {} }, { hash: "" }, win2);
  return globalThis.__h;
}
const renderiza = (aba, marcado = false) => renderizaCom(aba, () => (marcado ? "1" : null));
const abrePor = () => new Function("document", "localStorage", "location", "window", preparar(src.replace(/\{ const h = decodeURIComponent.*\r?\n/, "").replace(/render\(\);\s*$/, "")) + ";return atual;")(doc0(), { getItem: () => null, setItem() {} }, { hash: "" }, win);

test("todas as abas (um dia por aba, mais o histórico) renderizam sem undefined, NaN ou [object]", { skip: !html }, () => {
  for (const aba of [...dias.map((d) => "dia-" + d), "__hist"]) {
    const h = renderiza(aba);
    assert.ok(h.length > 200, aba + " vazia");
    assert.doesNotMatch(h, /undefined|NaN|\[object/, aba);
  }
});

test("abre SEMPRE no dia mais recente, mesmo que outro dia tenha sido aberto antes", { skip: !html }, () => {
  assert.strictEqual(abrePor(), "dia-" + dias[dias.length - 1]);
  assert.match(renderiza(null), new RegExp(`aria-selected="true" data-l="dia-${dias[dias.length - 1]}"`));
});

test("dias resolvidos: nenhum começa resolvido sem ninguém marcar; todos ficam resolvidos quando todos os passos estão marcados", { skip: !html }, () => {
  assert.match(renderiza(null, false), new RegExp(`0 de ${dias.length} dias resolvidos`));
  const h = renderiza(null, true);
  assert.match(h, new RegExp(`${dias.length} de ${dias.length} dias resolvidos`));
  assert.strictEqual((h.match(/class="dia res"/g) || []).length, dias.length);
  assert.match(h, /Dia resolvido/);
  assert.doesNotMatch(renderiza(null, false), /Marcar o dia inteiro|Reabrir o dia/);   // o botão do dia inteiro foi removido: só cada passo, um a um
  assert.doesNotMatch(h, /Marcar o dia inteiro|Reabrir o dia/);
});

test("lotes do dia em ordem cronológica: Meridiano 10:00 antes de Litoral 14:00", { skip: !html }, () => {
  for (const d of dias) { const h = renderiza("dia-" + d); assert.doesNotMatch(h, /14:00 e 10:00|Litoral \+ Meridiano/, d); }
  assert.match(renderiza("dia-" + dias[0]), /Fecha às 10:00 e 14:00/);   // 03/11 tem os dois lotes (13/11 só tem o do Meridiano)
});

test("a mesma pessoa em cópia não se repete na tela de ligações", { skip: !html }, () => {
  for (const c of D.ligacoes) assert.strictEqual(new Set(c.copia).size, c.copia.length, c.fornecedor);
});

test("todo dossiê e todo pedido de aprovação aparece em algum lote (nenhum fica invisível)", { skip: !html }, () => {
  const ids = (l) => l.decisoes.map((d) => d.id);
  for (const c of D.ligacoes) assert.ok(D.lotes.some((l) => ids(l).some((t) => c.titulos.includes(t) || c.casos.includes(t))), "dossiê invisível: " + c.fornecedor);
  for (const a of D.aprovacoes) assert.ok(D.lotes.some((l) => ids(l).some((t) => t === a.titulo_id || a.casos.includes(t))), "pedido invisível: " + a.id + " " + a.titulo_id);
});

test("a página não depende de internet: sem links externos de fonte, imagem ou script", { skip: !html }, () => {
  assert.doesNotMatch(html, /(src|href)=["']https?:\/\//);
  assert.doesNotMatch(html, /@import|fonts\.googleapis/);
});

test("kit de marca: logo, Poppins e as cores da paleta presentes; nada de 'GoGroup' escrito errado", { skip: !html }, () => {
  assert.match(html, /alt="Gogroup"/);
  assert.match(html, /font-family:'Poppins'/);
  for (const cor of ["#2659a5", "#d7d900", "#e5273c", "#3dbfef", "#f3f3f3"]) assert.ok(html.includes(cor), cor);
  assert.doesNotMatch(html, /GoGroup|goGroup|Go group/);
});

test('"Hoje" aparece só no dia mais recente (no botão e no bloco azul) e a legenda diz qual dia é', { skip: !html }, () => {
  const recente = dias[dias.length - 1], dd = recente.split("-").reverse().slice(0, 2).join("/");
  const h = renderiza(null);
  assert.strictEqual((h.match(/class="hoje"/g) || []).length, 1);
  assert.match(h, new RegExp(`data-l="dia-${recente}"[^>]*><span class="hoje">Hoje</span>`));
  assert.match(h, new RegExp(`Hoje · Dia ${dd}`));
  assert.match(h, new RegExp(`Hoje é ${dd}`));
  const antigo = renderiza("dia-" + dias[0]);                                    // abrindo outro dia, o bloco azul não diz "Hoje"
  assert.doesNotMatch(antigo, /Hoje · Dia/);
  assert.strictEqual((antigo.match(/class="hoje"/g) || []).length, 1);          // mas o botão do dia mais recente continua marcado
});

test("o período mostrado vem dos dados: dias, primeiro e último dia", { skip: !html }, () => {
  const p = D.placar, fmt = (iso) => iso.split("-").reverse().slice(0, 2).join("/");
  assert.strictEqual(p.dias, dias.length);
  assert.strictEqual(p.de, dias[0]);
  assert.strictEqual(p.ate, dias[dias.length - 1]);
  assert.ok(renderiza(null).includes(`O período inteiro (${fmt(p.de)} a ${fmt(p.ate)}, ${p.dias} dias)`));
});

// ---------- botão "Enviar e-mails" (SIMULADO) ----------
const lote0 = () => "dia-" + dias[dias.length - 1];
// o navegador guarda um registro por dia E por seção: "caixa:dia-AAAA-MM-DD:ligacao" (contato) e ":aprovacao"
const guardadoComEnvio = (k) => { const m = /^caixa:(dia-[\d-]+):ligacao$/.exec(k); return m ? JSON.stringify({ quando: Date.now(), ids: [`lig:${m[1]}:Embalarte`] }) : null; };

test("a tela de revisão avisa que é simulação, exige confirmação e começa com o envio travado", { skip: !html }, () => {
  assert.match(src, /nenhum e-mail é enviado de verdade/);
  assert.match(src, /Revisei os dossiês e confirmo que preciso escalar/);
  assert.match(src, /id="enviarAgora" disabled/);
  assert.match(src, /Revisar antes de enviar/);
});

test("a página não faz NENHUMA chamada de rede (nem para enviar e-mail): sem fetch, XMLHttpRequest, beacon, WebSocket ou mailto automático", { skip: !html }, () => {
  const codigo = src.replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(codigo, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|location\.href\s*=\s*["'`]mailto/);
});

test("Caixa de saída: vazia explica como usar; com envio mostra Para, assunto, o dossiê e o download do rascunho .eml", { skip: !html }, () => {
  assert.match(renderiza("__caixa"), /Nenhum e-mail enviado ainda/);
  const h = renderizaCom("__caixa", guardadoComEnvio);
  assert.match(h, /Baixar rascunho \(\.eml\)/);
  assert.match(h, /\[Conferente\] Entrar em contato com Embalarte/);
  assert.match(h, /livia\.campos@gogroup\.com\.br|renata\.paiva@gogroup\.com\.br/);
  assert.doesNotMatch(h, /undefined|NaN|\[object/);
});

test("todo dossiê aponta uma pessoa com e-mail no cadastro (ninguém fica sem destinatário)", { skip: !html }, () => {
  for (const c of D.ligacoes) assert.ok(D.pessoas.porId[c.pessoa_id] && D.pessoas.porId[c.pessoa_id].email, `${c.fornecedor}: ${c.pessoa_id} sem e-mail`);
});

test("texto de fornecedor vira texto, nunca HTML: o conteúdo do e-mail é escapado na tela", { skip: !html }, () => {
  const h = renderiza(lote0());
  assert.doesNotMatch(h, /<script[^>]*>[^<]*alert|<img[^>]+onerror/i);
});

// ---------- vocabulário: quem entra em contato é quem recebe o e-mail, não o tesoureiro; passos são "lidos" ----------
test('o passo diz "Entrar em contato com ..." e a tela não usa mais "Ligar para", "Quem liga" nem "Ligações para pessoas"', { skip: !html }, () => {
  const h = renderiza(null);
  assert.match(h, /Entrar em contato com /);
  assert.match(h, /Quem entra em contato:/);
  assert.match(h, /Perguntas para o contato/);
  assert.doesNotMatch(h, /Ligar para|Quem liga|Perguntas para a ligação|Ligações para pessoas|esperando a sua ligação/);
  for (const dia of dias) assert.doesNotMatch(renderiza("dia-" + dia), /Ligar para|Quem liga/, dia);
});

test('cada passo tem a caixa "Marcado como lido" (e não "Marcar como feito"); o botão do dia inteiro não existe', { skip: !html }, () => {
  const h = renderiza(null);
  const passos = (h.match(/class="card passo/g) || []).length;
  assert.ok(passos >= 2);
  assert.strictEqual((h.match(/Marcado como lido<\/label>/g) || []).length, passos);
  assert.doesNotMatch(h, /Marcar como feito|id="todos"|Marcar o dia inteiro/);
  assert.match(h, /passos? lidos?|passo lido/);                          // a barra de progresso fala em "lidos"
  assert.match(h, /marcados como lidos/);                                // e a legenda também
});


// ---------- o botão de envio mora DENTRO de cada seção e só libera depois de "Marcado como lido" ----------
// Cada passo é um <div class="card passo" id="passo-X">; devolve o HTML da seção X (até o próximo passo).
const secao = (h, k) => { const i = h.indexOf(`id="passo-${k}"`); if (i < 0) return null; const j = h.indexOf('class="card passo', i + 10); return h.slice(i, j < 0 ? undefined : j); };
// lê o número do rótulo "✉ Enviar e-mails (N)" do botão da seção, sem expressão regular
const botaoN = (sec, tipo) => {
  const s = sec || "", i = s.indexOf(`id="enviar-${tipo}"`); if (i < 0) return null;
  const marca = "✉ Enviar e-mails (", j = s.indexOf(marca, i); if (j < 0) return null;
  return Number(s.slice(j + marca.length, s.indexOf(")", j)));
};
// roda o script da página e devolve os e-mails que ela monta para o dia (tipo e id)
function emailsNaPagina(idDia) {
  const code = preparar(src.replace(/\{ const h = decodeURIComponent.*\r?\n/, "").replace(/render\(\);\s*$/, ""));
  return new Function("document", "localStorage", "location", "window", code + `;return emailsDoDia(DIAS.find((d) => d.lote === "${idDia}")).map((m) => ({ tipo: m.tipo, id: m.id }));`)(doc0(), { getItem: () => null, setItem() {} }, { hash: "" }, win);
}

test('o botão de envio fica DENTRO da seção "Entrar em contato", depois de "Marcado como lido", e não solto no topo da página', { skip: !html }, () => {
  for (const d of dias) {
    const h = renderiza("dia-" + d);
    const antes = h.slice(0, h.indexOf('id="passo-'));                       // hero, resumo, legenda e o título "Seus próximos passos"
    assert.doesNotMatch(antes, /Enviar e-mails/, d);
    const s = secao(h, "ligar");
    if (s) assert.match(s, /Marcado como lido<\/label>[^]*✉ Enviar e-mails \(\d+\)/, d);
  }
});

test("o envio só é liberado depois de marcar o passo como lido: travado e com aviso antes, liberado depois", { skip: !html }, () => {
  const antes = secao(renderiza(null, false), "ligar"), depois = secao(renderiza(null, true), "ligar");
  assert.match(antes, /id="enviar-ligacao" disabled/);
  assert.match(antes, /Marque como lido para liberar o envio/);
  assert.match(depois, /id="enviar-ligacao"/);
  assert.doesNotMatch(depois, /id="enviar-ligacao" disabled|Marque como lido para liberar/);
});

test("cada seção tem o seu botão, só com os e-mails do seu tipo; a seção de assinatura não envia nada", { skip: !html }, () => {
  let comAprovacao = 0;
  for (const d of dias) {
    const lote = "dia-" + d, h = renderiza(lote, true), esperados = emailsNaPagina(lote);
    const nLig = esperados.filter((m) => m.tipo === "ligacao").length, nApr = esperados.filter((m) => m.tipo === "aprovacao").length;
    assert.strictEqual(botaoN(secao(h, "ligar"), "ligacao"), nLig || null, d + " (contato)");
    assert.doesNotMatch(secao(h, "ligar") || "", /enviar-aprovacao/, d);
    if (nApr) { comAprovacao++; assert.strictEqual(botaoN(secao(h, "aprovar"), "aprovacao"), nApr, d + " (aprovação)"); }
    assert.doesNotMatch(secao(h, "assinar") || "", /Enviar e-mails/, d);
  }
  assert.ok(comAprovacao > 0, "nenhum dia da base tem pedido de aprovação: o teste não provou nada");
});

test("depois de enviar (simulado), SÓ a seção que enviou mostra o aviso com a hora e perde o botão; a outra segue com o dela", { skip: !html }, () => {
  const comAmbas = dias.find((d) => { const e = emailsNaPagina("dia-" + d); return e.some((m) => m.tipo === "ligacao") && e.some((m) => m.tipo === "aprovacao"); });
  assert.ok(comAmbas, "preciso de um dia com contato E aprovação");
  const h = renderizaCom("dia-" + comAmbas, guardadoComEnvio), lig = secao(h, "ligar"), apr = secao(h, "aprovar");
  assert.match(lig, /enviados? \(simulado\) às \d\d:\d\d/);
  assert.doesNotMatch(lig, /id="enviar-ligacao"/);
  assert.match(apr, /id="enviar-aprovacao"/);
  assert.doesNotMatch(apr, /enviados? \(simulado\)/);
});

// ---------- reinício do dia (para ensaiar e abrir limpo na apresentação) ----------
// roda o script da página com um armazenamento de verdade (Map) e um endereço (#hash) e devolve o que sobrou guardado
function comArmazenamento(hash, inicial) {
  const store = new Map(Object.entries(inicial));
  const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const code = preparar(src.replace(/\{ const h = decodeURIComponent.*\r?\n/, "").replace(/render\(\);\s*$/, ""));
  const atual = new Function("document", "localStorage", "location", "window", code + ";return atual;")(doc0(), ls, { hash, pathname: "/index.html", search: "" }, win);
  return { store, atual };
}
const diaHoje = () => "dia-" + dias[dias.length - 1], diaAnterior = () => "dia-" + dias[dias.length - 2];
const estadoCheio = () => ({ [`ok:${diaHoje()}:ligar`]: "1", [`ok:${diaHoje()}:assinar`]: "1", [`caixa:${diaHoje()}:ligacao`]: "{}", [`caixa:${diaHoje()}`]: "{}", [`ok:${diaAnterior()}:ligar`]: "1", [`caixa:${diaAnterior()}:ligacao`]: "{}" });

test("#reiniciar apaga as leituras e os e-mails enviados do dia mais recente (Hoje) e NADA dos outros dias", { skip: !html }, () => {
  const { store, atual } = comArmazenamento("#reiniciar", estadoCheio());
  assert.deepStrictEqual([...store.keys()].filter((k) => k.includes(diaHoje())), [], "sobrou estado de hoje");
  assert.ok(store.has(`ok:${diaAnterior()}:ligar`) && store.has(`caixa:${diaAnterior()}:ligacao`), "apagou o dia anterior");
  assert.strictEqual(atual, diaHoje());
});

test("sem o #reiniciar, abrir a página não apaga nada", { skip: !html }, () => {
  const inicial = estadoCheio(), { store } = comArmazenamento("", inicial);
  assert.strictEqual(store.size, Object.keys(inicial).length);
  assert.strictEqual(comArmazenamento("#dia-2026-11-03", inicial).store.size, Object.keys(inicial).length);
});

test("cada dia tem o link discreto para reiniciar a demonstração (e ele reinicia aquele dia)", { skip: !html }, () => {
  for (const d of dias) assert.match(renderiza("dia-" + d), /id="reiniciar"[^>]*>Reiniciar as leituras e os e-mails enviados deste dia/, d);
  assert.match(src, /reiniciar\.onclick = \(\) => \{ reiniciarDia\(l\.lote\)/);
});

test("passo lido: o botão de envio liberado NÃO fica esmaecido (só o conteúdo lido esmaece)", { skip: !html }, () => {
  assert.doesNotMatch(html, /\.passo\.feito\{opacity:\.62\}/);                                  // o cartão inteiro não esmaece mais
  assert.match(html, /\.passo\.feito > div:last-child > :not\(label\.ok\):not\(\.envio\)\{opacity:\.62\}/);
});
