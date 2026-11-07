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
  assert.match(renderiza(null, false), /Marcar o dia inteiro como resolvido/);
  assert.match(h, /Reabrir o dia/);
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
const guardadoComEnvio = (k) => (k.startsWith("caixa:") ? JSON.stringify({ quando: Date.now(), ids: [`lig:${k.slice(6)}:Embalarte`] }) : null);

test('o botão "Enviar e-mails (N)" aparece no dia com pendências, com N maior que zero', { skip: !html }, () => {
  const h = renderiza(null);
  const n = /✉ Enviar e-mails \((\d+)\)/.exec(h);
  assert.ok(n && Number(n[1]) >= 1, "faltou o botão de envio");
});

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

test("depois de enviar (simulado), o dia mostra o aviso com a hora e o botão some", { skip: !html }, () => {
  const h = renderizaCom(lote0(), guardadoComEnvio);
  assert.match(h, /enviado \(simulado\) às \d\d:\d\d|enviados\? \(simulado\)|e-mails? enviados? \(simulado\)/);
  assert.doesNotMatch(h, /id="enviar"/);
});

test("Caixa de saída: vazia explica como usar; com envio mostra Para, assunto, o dossiê e o download do rascunho .eml", { skip: !html }, () => {
  assert.match(renderiza("__caixa"), /Nenhum e-mail enviado ainda/);
  const h = renderizaCom("__caixa", guardadoComEnvio);
  assert.match(h, /Baixar rascunho \(\.eml\)/);
  assert.match(h, /\[Conferente\] Ligar para Embalarte/);
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
