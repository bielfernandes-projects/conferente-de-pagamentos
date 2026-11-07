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
module.exports = { calcular };

if (require.main === module) {
  const r = calcular(); S.gravarAgente("duplicidades_ja_pagas.json", r);
  const f = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  console.log(`${r.grupos} grupos · ${r.pagamentosAMais} pagamentos a mais · R$ ${f(r.total)}`);
  console.log(`Meridiano: ${r.meridiano.n} (R$ ${f(r.meridiano.soma)}) · com débito no extrato: ${r.confirmadoNoExtrato.n} (R$ ${f(r.confirmadoNoExtrato.soma)}) · Litoral (sem conferir no extrato): ${r.litoral.n}`);
}
