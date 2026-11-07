// Estrutura do deck do pitch: a sequência de minutos do workshop, notas, números vindos dos dados e marca. Rode: node --test pitch/
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const arq = path.join(__dirname, "pitch.html");
const html = fs.existsSync(arq) ? fs.readFileSync(arq, "utf8") : null;
const saida = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "conferente", "saida", f), "utf8"));
// o que aparece no slide, sem as notas de fala (elas repetem números e dizem o que NÃO afirmamos)
const visivel = html ? html.replace(/<aside class="notes">[\s\S]*?<\/aside>/g, "") : "";
const secoes = html ? [...html.matchAll(/<section class="slide[^"]*"([^>]*)>([\s\S]*?)<\/section>/g)] : [];
const raiz = path.join(__dirname, "..");
const temSaidas = fs.existsSync(path.join(raiz, "conferente", "saida", "placar.json"));   // saídas geradas: não vão para o repositório
const temBase = fs.existsSync(path.join(raiz, "base-de-dados", "GoHacks_Talent_2026_bases_csv", "pagamentos", "fornecedores.csv"));
const principais = secoes.filter((s) => !/data-ap=/.test(s[1]));

test("segue a estrutura de 5 minutos do workshop, na ordem", { skip: !html }, () => {
  const alvos = principais.map((s) => /data-alvo="([^"]*)"/.exec(s[1])[1]);
  assert.deepStrictEqual(alvos, ["0:00", "0:15", "0:50", "1:20", "2:10", "3:30", "4:00", "5:00"]);
  const rot = principais.map((s) => /data-rotulo="([^"]*)"/.exec(s[1])[1]);
  assert.deepStrictEqual(rot.slice(0, 7), ["Abertura", "A dor", "Visão 360", "O agente", "Demo", "Como fez", "Impacto"]);
});

test("todo slide tem nota de fala; o da demo diz como abrir a página ", { skip: !html }, () => {
  for (const s of secoes) assert.match(s[2], /<aside class="notes">[\s\S]{40,}<\/aside>/);
  const demo = principais[4][2];
  assert.match(demo, /index\.html#dia-2026-11-03/);
});

test("números do slide vêm dos dados, não de texto digitado", { skip: !html || !temSaidas }, () => {
  const dup = saida("duplicidades_ja_pagas.json"), placar = saida("placar.json"), jan = saida("duplicidades_na_janela.json");
  const mil = (v) => "R$ " + Math.round(v / 1000).toLocaleString("pt-BR") + " mil";
  for (const n of [mil(dup.total), mil(dup.confirmadoNoExtrato.soma), mil(placar.em_risco), mil(placar.cancelado), mil(jan.duplicatas.soma), mil(jan.canceladas.soma), mil(jan.retidasParaAprovacao.soma)]) assert.ok(visivel.includes(n), n);
});

test("o número de testes no slide é o de testes que passam", { skip: !html || !temBase }, () => {
  const { spawnSync } = require("child_process");
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;   // senão o node --test filho muda o formato da saída
  const r = spawnSync(process.execPath, ["--test", "tests/"], { cwd: path.join(__dirname, "..", "conferente"), encoding: "utf8", env });
  const n = /ℹ tests (\d+)/.exec(r.stdout)[1];
  assert.strictEqual(/ℹ pass (\d+)/.exec(r.stdout)[1], n);
  assert.ok(visivel.includes(`${n} testes`), `o slide deveria dizer ${n} testes`);
});

test("honestidade: premissa do tempo marcada como a validar e nenhuma promessa de que o agente 'teria evitado' o histórico", { skip: !html }, () => {
  assert.match(html, /Premissa de 10 min a validar/);
  assert.doesNotMatch(visivel, /teria evitado|evitou os/);
});

test("offline e marca: sem recurso externo, palco 16:9 fixo, Poppins e logo, 'Gogroup' escrito certo", { skip: !html }, () => {
  assert.doesNotMatch(html, /(src|href)=["']https?:\/\//);
  assert.doesNotMatch(html, /fonts\.googleapis|api\.fontshare/);
  assert.match(html, /\.deck-stage/);
  assert.match(html, /font-family:'Poppins'/);
  assert.match(html, /alt="Gogroup"/);
  assert.doesNotMatch(html, /GoGroup|goGroup|Go group/);
});
