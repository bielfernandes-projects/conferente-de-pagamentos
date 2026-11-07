// Seam de dados. Dois adapters: CSV em disco (padrão) e em memória (testes: dados.usar({...})).
const { csv } = require("./lib");

const porId = (a, k) => Object.fromEntries(a.map((x) => [x[k], x]));
const agrupar = (a, f) => a.reduce((m, x) => ((m[f(x)] = m[f(x)] || []).push(x), m), {});

function doCsv() {
  const cp = csv("contas_a_pagar.csv");
  return {
    forn: porId(csv("fornecedores.csv"), "fornecedor_id"), cp, cpById: porId(cp, "titulo_id"),
    agenda: csv("agenda_remessa.csv"), nfs: csv("notas_fiscais.csv"), dups: agrupar(csv("nf_duplicatas.csv"), (x) => x.chave_acesso),
    oc: porId(csv("pedidos_compra.csv"), "oc_id"), alt: csv("alteracoes_cadastro.csv"), msgs: csv("comunicacoes_fornecedores.csv"), usuarios: csv("usuarios_sistema.csv"),
  };
}

let atual = null;
module.exports = {
  carregar: () => atual || (atual = doCsv()),
  usar: (d) => { atual = { ...d, cpById: d.cpById || porId(d.cp || [], "titulo_id") }; },   // adapter em memória
  agrupar,
};
