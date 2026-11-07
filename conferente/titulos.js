// A regra única de "estes dois títulos são o mesmo?" (duplicidade). Motor e travas do ERP usam esta; ninguém reimplementa.
const P = require("./politica");

const normNF = (s) => String(s || "").split(/[-/]/)[0].replace(/^0+/, "");     // "000123", "123-1" e "123/2" são a NF 123
const raizCnpj = (s) => String(s || "").replace(/\D/g, "").slice(0, 8);         // filial tem a mesma raiz de 8 dígitos

// Títulos do mesmo fornecedor, mesma NF e parcela, valor dentro da tolerância, e não cancelados.
// `valor` permite perguntar "e se eu corrigisse para este valor?"; `status` permite ler o estado simulado em vez do CSV.
function gemeos(t, todos, { valor = Number(t.valor), status = (x) => x.status } = {}) {
  const n = normNF(t.numero_nf_digitado);
  if (!n) return [];
  const tol = P.toleranciaDuplicata(valor);
  return todos.filter((x) => x.titulo_id !== t.titulo_id && x.fornecedor_id === t.fornecedor_id && normNF(x.numero_nf_digitado) === n
    && x.parcela === t.parcela && Math.abs(Number(x.valor) - valor) <= tol && status(x) !== "cancelado");
}
const maisAntigo = (t) => (x) => x.data_lancamento < t.data_lancamento;

module.exports = { normNF, raizCnpj, gemeos, maisAntigo };
