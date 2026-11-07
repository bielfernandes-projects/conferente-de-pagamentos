// Conferência independente das ações do agente contra os CSVs (não usa nada do agente além do log de ações).
const { csv } = require("./lib");
const P = require("./politica");   // só os NÚMEROS da política; a comparação abaixo é de propósito independente do ERP (titulos.js)
const j = require("./saida/agente_semana.json");
const cp = csv("contas_a_pagar.csv"), nf = csv("notas_fiscais.csv"), dp = csv("nf_duplicatas.csv"), ag = csv("agenda_remessa.csv"), fo = Object.fromEntries(csv("fornecedores.csv").map((x) => [x.fornecedor_id, x]));
const by = Object.fromEntries(cp.map((x) => [x.titulo_id, x])), lote = Object.fromEntries(ag.map((x) => [x.titulo_id, x]));
const norm = (s) => String(s || "").split(/[-/]/)[0].replace(/^0+/, ""), raiz = (s) => String(s).replace(/\D/g, "").slice(0, 8);
const dupOf = (t) => { const f = fo[t.fornecedor_id]; const n = nf.find((x) => norm(x.numero_nf) === norm(t.numero_nf_digitado) && raiz(x.cnpj_emitente) === raiz(f.cnpj)); return n && dp.find((d) => d.chave_acesso === n.chave_acesso && +d.n_dup === +t.parcela.split("/")[0]); };
console.log("=== CANCELAMENTOS: o cancelado é o título mais NOVO e existe outro vivo igual? ===");
j.estado.acoes.filter((a) => a.ferramenta === "cancelar_titulo" && a.resultado.executado).forEach((a) => {
  const t = by[a.args.titulo_id];
  const irm = cp.filter((x) => x.titulo_id !== t.titulo_id && x.fornecedor_id === t.fornecedor_id && norm(x.numero_nf_digitado) === norm(t.numero_nf_digitado) && x.parcela === t.parcela && Math.abs(x.valor - t.valor) <= Math.max(P.DUP_TOL_MIN, P.DUP_TOL_PCT * t.valor));
  const original = irm.find((x) => x.data_lancamento < t.data_lancamento);
  console.log(t.titulo_id, "R$", t.valor, "| irmão mais antigo:", original ? original.titulo_id + " (" + original.status + ", " + original.data_lancamento.slice(0, 10) + " vs " + t.data_lancamento.slice(0, 10) + ")" : "NENHUM → cancelamento SEM par igual mais antigo!");
});
console.log("\n=== CORREÇÕES: valor novo == duplicata da NF? (e título atrasado pode ter multa/juros) ===");
j.estado.acoes.filter((a) => a.ferramenta === "corrigir_lancamento" && a.resultado.executado).forEach((a) => {
  const t = by[a.args.titulo_id], d = dupOf(t), l = lote[t.titulo_id];
  console.log(t.titulo_id, "valor", a.resultado.valor_anterior, "→", a.resultado.valor_novo, "| duplicata:", d && d.valor, "venc dup:", d && d.vencimento.slice(0, 10), "| data do lote:", l && l.data_prevista, "| diferença p/ duplicata:", d && (a.resultado.valor_novo - d.valor).toFixed(2));
});
console.log("\n=== APROVAÇÕES PEDIDAS ===");
j.estado.aprovacoes.forEach((a) => { const t = by[a.titulo_id]; console.log(a.id, a.acao, a.titulo_id, "R$", t.valor, JSON.stringify(a.parametros)); });
console.log("\n=== Escalados SEM a ferramenta de ligação (retirados do lote por outro caminho) ===");
const dos = new Set(j.estado.contatos.flatMap((c) => c.titulos));
j.resultados.filter((r) => j.estado.titulos[r.titulo_id].status === "retirado" && !dos.has(r.titulo_id)).forEach((r) => console.log(r.titulo_id, "|", r.conclusao.resultado, "|", (r.conclusao.resumo || "").slice(0, 150)));
console.log("\n=== Casos sem nenhuma ação de execução ===");
j.resultados.filter((r) => !r.trace.some((s) => ["corrigir_lancamento", "cancelar_titulo", "retirar_do_lote", "escalar_para_humano", "solicitar_aprovacao", "agendar_titulo"].includes(s.ferramenta))).forEach((r) => console.log(r.titulo_id, r.conclusao.resultado, (r.conclusao.resumo || "").slice(0, 140)));
