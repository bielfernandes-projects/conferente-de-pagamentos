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
  // os cartões internos (fornecedor, com o botão "Devolver ao lote") também não esmaecem: o botão tem que continuar legível depois de "lido"
  assert.ok(html.includes(".passo.feito > div:last-child > :not(label.ok):not(.envio):not(.card){opacity:.62}"));
});

// ---------- Devolver ao lote (SIMULADO) ----------
const hojeLotes = () => D.lotes.filter((l) => l.data === dias[dias.length - 1]);
const escaladosHoje = () => hojeLotes().flatMap((l) => l.decisoes).filter((d) => d.final === "escalado");
const emailsEnviados = () => ({ [`caixa:${diaHoje()}:ligacao`]: JSON.stringify({ quando: Date.now(), ids: [] }) });   // os e-mails de contato do dia já foram enviados
// roda a página com armazenamento de verdade, botões que respondem ao clique e uma janela de revisão (modal) de mentira.
// alcada: troca a alçada de quem faz o contato (PS01) para exercitar o caminho "acima da alçada".
function comCliques(inicial = {}, aba = null, enviado = true, alcada = null) {
  const store = new Map(Object.entries({ ...(enviado ? emailsEnviados() : {}), ...inicial })), els = {}, botoes = { dev: [], resp: [] };
  let modal = null;
  const fake = () => ({ onclick: null, onchange: null, checked: false, disabled: false, style: {}, focus() {} });
  const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const doc = { getElementById: (id) => (els[id] = els[id] || { innerHTML: "", querySelectorAll: () => [] }),
    createElement: () => { const filhos = {}; const el = { innerHTML: "", className: "", id: "", remove() { if (modal === el) modal = null; }, addEventListener() {}, querySelector: (sel) => (filhos[sel] = filhos[sel] || fake()) }; return el; },
    body: { appendChild: (el) => { modal = el; } }, addEventListener() {}, removeEventListener() {},
    querySelectorAll: (sel) => { const a = sel === "[data-dev]" ? "dev" : sel === "[data-resp]" ? "resp" : null; if (!a) return [];
      botoes[a] = (els.app ? els.app.innerHTML : "").split(`data-${a}="`).slice(1).map((p) => ({ dataset: { [a]: p.split('"')[0] }, onclick: null })); return botoes[a]; } };
  let code = preparar(src.replace(/\{ const h = decodeURIComponent.*\r?\n/, "").replace(/render\(\);\s*$/, ""));
  code = code.replace(/let atual = .*\r?\n/, (m) => (alcada != null ? `D.pessoas.porId.PS01.alcada = ${alcada};\n` : "") + (aba ? `let atual = "${aba}";\n` : m));
  new Function("document", "localStorage", "location", "window", code + ";render();")(doc, ls, { hash: "" }, win);
  const clica = (id) => botoes.dev.find((x) => x.dataset.dev === id).onclick();
  const confirma = () => { const c = modal.querySelector("#confirmo"); c.checked = true; c.onchange(); modal.querySelector("#enviarAgora").onclick(); };
  return { store, html: () => els.app.innerHTML, clica, confirma, devolve: (id) => { clica(id); confirma(); },
    modalHtml: () => (modal ? modal.innerHTML : null), cancela: () => modal.querySelector("#cancelar").onclick(), envioTravado: () => (modal.querySelector("#enviarAgora").disabled = modal.querySelector("#enviarAgora").disabled),
    responde: (id, r) => botoes.resp.find((x) => x.dataset.resp === `${id}|${r}`).onclick(), respostas: () => botoes.resp.map((x) => x.dataset.resp) };
}
const n = (h, re) => (h.match(re) || []).length;
const retidos = (h) => +/<b>(\d+)<\/b><span>Retidos para uma pessoa/.exec(h)[1], liberados = (h) => +/<b>(\d+)<\/b><span>Liberados/.exec(h)[1];
const semEnvioNaCaixa = /Caixa de saída<\/b><small>0 e-mail\(s\), simulado/;

test("devolver ao lote: quem fez o contato (Renata, alçada R$ 50 mil) cobre todos os títulos, então todos têm 'Devolver ao lote'", { skip: !html }, () => {
  const esc = escaladosHoje(), h = comCliques().html();
  assert.ok(esc.length > 0 && esc.some((d) => d.valor > 5000), "o dia de hoje precisa ter título acima de R$ 5 mil para este teste valer");
  assert.strictEqual(n(h, /data-dev="/g), esc.length);
  assert.strictEqual(n(h, /↩ Devolver ao lote<\/button>/g), esc.length);
  assert.doesNotMatch(h, /Pedir aprovação para devolver/);
  assert.match(h, /Quem entrou em contato \(Renata Paiva\) autoriza a devolução até a alçada dela \(R\$ 50\.000,00\)/);
  assert.match(h, /lote fecha às \d\d:\d\d/);
  assert.match(h, /Depois do fechamento o ERP recusa\. Simulado: nada é gravado no ERP/);
});

test("devolver dentro da alçada: abre a revisão do e-mail (registro) com confirmação; só ao confirmar o título volta e os totais mudam", { skip: !html }, () => {
  const d = escaladosHoje().find((x) => x.valor > 5000), p = comCliques(), h0 = p.html();
  p.clica(d.id);
  const m = p.modalHtml();
  assert.match(m, /Revisar antes de enviar/);
  assert.match(m, /Simulação/);
  assert.match(m, new RegExp(`Registro: título ${d.id}`));
  assert.match(m, /autorizado por Renata Paiva/);
  assert.match(m, /Revisei o e-mail e confirmo a devolução do título ao lote/);
  assert.ok(![...p.store.keys()].some((k) => k.startsWith("dev:")), "gravou antes de confirmar");
  p.confirma();
  assert.strictEqual(p.modalHtml(), null);                                                   // a janela fecha
  const reg = JSON.parse(p.store.get(`dev:${diaHoje()}:${d.id}`));
  assert.deepStrictEqual([reg.tipo, reg.via, reg.por], ["devolvido", "alcada", "Renata Paiva"]);
  assert.ok(reg.emailEm > 0);
  const h = p.html();
  assert.strictEqual(retidos(h), retidos(h0) - 1);
  assert.strictEqual(liberados(h), liberados(h0) + 1);
  assert.match(h, /Devolvido ao lote \(simulado\) às \d\d:\d\d · autorizado por Renata Paiva/);
  assert.doesNotMatch(h, new RegExp(`data-dev="${d.id}"`));
});

test("cancelar a revisão não devolve nada", { skip: !html }, () => {
  const d = escaladosHoje()[0], p = comCliques();
  p.clica(d.id); p.cancela();
  assert.strictEqual(p.modalHtml(), null);
  assert.ok(![...p.store.keys()].some((k) => k.startsWith("dev:")));
  assert.match(p.html(), new RegExp(`data-dev="${d.id}"`));
});

test("acima da alçada de quem fez o contato: botão vira 'Pedir aprovação para devolver', o e-mail vai ao aprovador e o título CONTINUA fora do lote", { skip: !html }, () => {
  const esc = escaladosHoje(), alto = esc.find((x) => x.valor > 5000), p = comCliques({}, null, true, 5000), h0 = p.html();
  assert.strictEqual(n(h0, /↩ Pedir aprovação para devolver<\/button>/g), esc.filter((x) => x.valor > 5000).length);
  assert.strictEqual(n(h0, /↩ Devolver ao lote<\/button>/g), esc.filter((x) => x.valor <= 5000).length);
  p.clica(alto.id);
  assert.match(p.modalHtml(), new RegExp(`Aprovar ou recusar: devolver o título ${alto.id}`));
  assert.match(p.modalHtml(), /Revisei o e-mail e confirmo o pedido de aprovação/);
  p.confirma();
  const h = p.html();
  assert.match(h, /Aguardando aprovação · pedido enviado ao aprovador \(simulado\)/);
  assert.match(h, /Ensaio da resposta do aprovador \(simulação\)/);
  assert.strictEqual(retidos(h), retidos(h0));
  const reg = JSON.parse(p.store.get(`dev:${diaHoje()}:${alto.id}`));
  assert.deepStrictEqual([reg.tipo, reg.via], ["pedido", undefined]);
  assert.deepStrictEqual(p.respostas().sort(), [`${alto.id}|aprovou`, `${alto.id}|reprovou`]);
});

test("sem alçada nenhuma (alçada 0), todo título pede aprovação", { skip: !html }, () => {
  const esc = escaladosHoje(), h = comCliques({}, null, true, 0).html();
  assert.strictEqual(n(h, /↩ Pedir aprovação para devolver<\/button>/g), esc.length);
  assert.match(h, /Todo pedido de devolução vai ao aprovador/);
});

test("resposta simulada do aprovador: APROVOU devolve o título (totais mudam, 'após aprovação'); REPROVOU mantém fora e encerra", { skip: !html }, () => {
  const [a, r] = escaladosHoje().filter((x) => x.valor > 5000), p = comCliques({}, null, true, 5000), h0 = p.html();
  assert.ok(a && r, "precisa de 2 títulos acima de R$ 5 mil");
  p.devolve(a.id); p.devolve(r.id);
  p.responde(a.id, "aprovou");
  let h = p.html();
  assert.match(h, /Devolvido ao lote após aprovação \(simulado\)/);
  assert.strictEqual(retidos(h), retidos(h0) - 1);
  assert.strictEqual(liberados(h), liberados(h0) + 1);
  p.responde(r.id, "reprovou");
  h = p.html();
  assert.match(h, /Reprovado pelo aprovador \(simulado\)[^<]*o título continua fora do lote/);
  assert.strictEqual(retidos(h), retidos(h0) - 1);
  assert.deepStrictEqual(p.respostas(), []);
  assert.strictEqual(JSON.parse(p.store.get(`dev:${diaHoje()}:${r.id}`)).tipo, "reprovado");
  assert.strictEqual(JSON.parse(p.store.get(`dev:${diaHoje()}:${a.id}`)).via, "aprovador");
});

test("resposta simulada: só existe depois do pedido (sem pedido, ou já decidido, não há botões de ensaio)", { skip: !html }, () => {
  const d = escaladosHoje().find((x) => x.valor > 5000);
  assert.deepStrictEqual(comCliques().respostas(), []);
  const reprovado = comCliques({ [`dev:${diaHoje()}:${d.id}`]: JSON.stringify({ quando: Date.now(), tipo: "reprovado", emailEm: Date.now() }) });
  assert.deepStrictEqual(reprovado.respostas(), []);
  assert.match(reprovado.html(), /Reprovado pelo aprovador \(simulado\)/);
});

test("Caixa de saída: devolução dentro da alçada entra como 'registrado', pedido entra como 'aguardando'/'aprovado'; o contador soma os dois", { skip: !html }, () => {
  const p = comCliques({}, null, true, 6000);   // alçada 6 mil: cobre os títulos de até R$ 6 mil; o resto vira pedido
  const baixo = escaladosHoje().filter((x) => x.valor <= 6000)[0], alto = escaladosHoje().find((x) => x.valor > 6000);
  assert.match(p.html(), semEnvioNaCaixa);
  p.devolve(baixo.id);
  assert.match(p.html(), /Caixa de saída<\/b><small>1 e-mail\(s\), simulado/);
  p.devolve(alto.id);
  assert.match(p.html(), /Caixa de saída<\/b><small>2 e-mail\(s\), simulado/);
  const cx = comCliques(Object.fromEntries(p.store), "__caixa", true, 6000).html();
  assert.match(cx, /devoluções ao lote/);
  assert.match(cx, new RegExp(`Registro: título ${baixo.id}`));
  assert.match(cx, new RegExp(`devolver o título ${alto.id}`));
  assert.match(cx, /registrado \(simulado\)/);
  assert.match(cx, /aguardando aprovação/);
  assert.match(cx, /Baixar rascunho \(\.eml\)/);
  p.responde(alto.id, "aprovou");
  assert.match(comCliques(Object.fromEntries(p.store), "__caixa", true, 6000).html(), /aprovado \(simulado\)/);
});

test("devolver ao lote: o estado guardado sobrevive a recarregar e o reinício do dia o apaga (só do dia mais recente)", { skip: !html }, () => {
  const d = escaladosHoje()[0], outro = `dev:${diaAnterior()}:X`;
  const inicial = { [`dev:${diaHoje()}:${d.id}`]: JSON.stringify({ quando: Date.now(), tipo: "devolvido", via: "alcada", por: "Renata Paiva" }), [outro]: "{}" };
  assert.match(comCliques(inicial).html(), /Devolvido ao lote \(simulado\)/);
  const { store } = comArmazenamento("#reiniciar", inicial);
  assert.ok(![...store.keys()].some((k) => k.startsWith(`dev:${diaHoje()}:`)), "sobrou devolução de hoje");
  assert.ok(store.has(outro), "apagou de outro dia");
});

test("devolver ao lote: registro quebrado ou desconhecido no armazenamento é ignorado", { skip: !html }, () => {
  const d = escaladosHoje()[0];
  for (const lixo of ["1", "{", '{"tipo":"hackeado"}', "null"]) assert.doesNotMatch(comCliques({ [`dev:${diaHoje()}:${d.id}`]: lixo }).html(), /Devolvido ao lote \(simulado\)|Aguardando aprovação/, lixo);
});

test("devolver ao lote só é liberado depois de enviar os e-mails de contato: antes, botões travados, com aviso, e o clique é ignorado", { skip: !html }, () => {
  const esc = escaladosHoje(), p = comCliques({}, null, false), h = p.html();
  assert.strictEqual(n(h, /data-dev="[^"]*" disabled /g), esc.length);
  assert.match(h, /Envie os e-mails de contato \(depois de marcar como lido\) para liberar estes botões/);
  p.clica(esc[0].id);                                                                         // mesmo clicando (à força), nada abre nem é gravado
  assert.strictEqual(p.modalHtml(), null);
  assert.ok(![...p.store.keys()].some((k) => k.startsWith("dev:")));
  const liberado = comCliques({}, null, true).html();
  assert.strictEqual(n(liberado, /data-dev="[^"]*" disabled /g), 0);
  assert.doesNotMatch(liberado, /Envie os e-mails de contato \(depois de marcar como lido\)/);
});

test("o envio de OUTRA seção (aprovação) não libera o devolver: só o envio dos e-mails de contato", { skip: !html }, () => {
  const so = { [`caixa:${diaHoje()}:aprovacao`]: JSON.stringify({ quando: Date.now(), ids: [] }) };
  assert.strictEqual(n(comCliques(so, null, false).html(), /data-dev="[^"]*" disabled /g), escaladosHoje().length);
});
