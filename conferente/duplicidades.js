// Quanto dinheiro já saiu em DOBRO na base? Usa a regra única de duplicidade (titulos.js) sobre os títulos PAGOS
// e confirma no extrato do Banco Meridiano (documento = título nos pagamentos por lote). Grava saida/duplicidades_ja_pagas.json.
//   node duplicidades.js
const { csv } = require("./lib");
const D = require("./dados"), T = require("./titulos"), S = require("./saida");

function calcular(dados = D.carregar(), extratoMeridiano = csv("extrato_banco_meridiano.csv")) {
  const debitos = new Set(extratoMeridiano.filter((r) => r.documento && Number(r.valor) < 0).map((r) => r.documento));
  const pagos = dados.cp.filter((t) => t.status === "pago" && T.normNF(t.numero_nf_digitado));
  const vistos = new Set(), grupos = [];
  for (const t of pagos) {
    if (vistos.has(t.titulo_id)) continue;
    const g = T.gemeos(t, pagos); if (!g.length) continue;
    const grupo = [t, ...g]; grupo.forEach((x) => vistos.add(x.titulo_id));
    grupo.sort((a, b) => a.data_lancamento.localeCompare(b.data_lancamento));
    // o primeiro (mais antigo) é o legítimo; os demais são pagamento a mais
    grupos.push({ fornecedor: dados.forn[t.fornecedor_id].nome_fantasia, nf: T.normNF(t.numero_nf_digitado), parcela: t.parcela, titulos: grupo.map((x) => x.titulo_id), extras: grupo.slice(1).map((x) => ({ id: x.titulo_id, valor: Number(x.valor), banco: x.banco_pagador, debitoNoExtrato: x.banco_pagador === "Banco Meridiano" ? debitos.has(x.titulo_id) : null })) });
  }
  const extras = grupos.flatMap((g) => g.extras), soma = (a) => a.reduce((s, x) => s + x.valor, 0);
  const mer = extras.filter((x) => x.banco === "Banco Meridiano");
  return { grupos: grupos.length, pagamentosAMais: extras.length, total: soma(extras),
    meridiano: { n: mer.length, soma: soma(mer) }, confirmadoNoExtrato: { n: mer.filter((x) => x.debitoNoExtrato).length, soma: soma(mer.filter((x) => x.debitoNoExtrato)) },
    litoral: { n: extras.filter((x) => x.banco === "Banco Litoral").length }, detalhe: grupos.sort((a, b) => soma(b.extras) - soma(a.extras)) };
}
// O que o agente fez com as duplicatas DENTRO dos lotes que ele processou (a agenda, não o histórico já pago).
// Duplicata = título da agenda com um gêmeo vivo (pago ou agendado) lançado ANTES dele; o mais antigo é o legítimo.
function naJanela(dados = D.carregar(), estado = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "saida", "agente_semana.json"), "utf8")).estado) {
  const vivos = dados.cp.filter((t) => ["pago", "agendado"].includes(t.status) && T.normNF(t.numero_nf_digitado));
  const soma = (a) => a.reduce((s, x) => s + x.valor, 0), grupo = (a) => ({ n: a.length, soma: soma(a) });
  const dups = dados.agenda.map((a) => dados.cpById[a.titulo_id]).filter((t) => T.normNF(t.numero_nf_digitado) && T.gemeos(t, vivos).some((g) => g.data_lancamento < t.data_lancamento))
    .map((t) => ({ id: t.titulo_id, valor: Number(t.valor), status: estado.titulos[t.titulo_id]?.status || "agendado" }));
  return { titulosNaAgenda: dados.agenda.length, duplicatas: grupo(dups), canceladas: grupo(dups.filter((x) => x.status === "cancelado")),
    retidasParaAprovacao: grupo(dups.filter((x) => x.status === "retirado")), aindaNoLote: grupo(dups.filter((x) => x.status !== "cancelado" && x.status !== "retirado")), ids: dups.map((x) => x.id) };
}
module.exports = { calcular, naJanela };

if (require.main === module) {
  const w = naJanela(); S.gravarAgente("duplicidades_na_janela.json", w);
  const fm = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  console.log(`Na janela (${w.titulosNaAgenda} títulos): ${w.duplicatas.n} duplicatas R$ ${fm(w.duplicatas.soma)} · canceladas ${w.canceladas.n} (R$ ${fm(w.canceladas.soma)}) · retidas p/ aprovação ${w.retidasParaAprovacao.n} (R$ ${fm(w.retidasParaAprovacao.soma)}) · ainda no lote ${w.aindaNoLote.n}`);
  const r = calcular(); S.gravarAgente("duplicidades_ja_pagas.json", r);
  const f = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  console.log(`${r.grupos} grupos · ${r.pagamentosAMais} pagamentos a mais · R$ ${f(r.total)}`);
  console.log(`Meridiano: ${r.meridiano.n} (R$ ${f(r.meridiano.soma)}) · com débito no extrato: ${r.confirmadoNoExtrato.n} (R$ ${f(r.confirmadoNoExtrato.soma)}) · Litoral (sem conferir no extrato): ${r.litoral.n}`);
}
