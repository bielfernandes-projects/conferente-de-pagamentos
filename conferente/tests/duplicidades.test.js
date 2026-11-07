// Contagem de dinheiro já pago em dobro, sobre dados em memória (sem CSV): o primeiro título do grupo é o legítimo.
const test = require("node:test");
const assert = require("node:assert");
const { calcular } = require("../duplicidades");

const f = { F1: { nome_fantasia: "Acme" } };
const pago = (id, nf, valor, lanc, over = {}) => ({ titulo_id: id, fornecedor_id: "F1", numero_nf_digitado: nf, parcela: "1/1", valor: String(valor), status: "pago", data_lancamento: lanc, banco_pagador: "Banco Meridiano", ...over });

test("conta só o que passa do primeiro título da mesma NF e parcela, e confirma no extrato", () => {
  const cp = [pago("A", "123", 1000, "2026-10-01"), pago("B", "000123-1", 1004, "2026-10-05"),    // B é pagamento a mais (0,4%)
    pago("C", "999", 500, "2026-10-01"),                                                          // sozinho: não conta
    pago("D", "", 800, "2026-10-01"), pago("E", "", 800, "2026-10-02")];                          // sem NF (ex.: aluguel): ignorado
  const r = calcular({ cp, forn: f }, [{ documento: "B", valor: "-1004.00" }]);
  assert.strictEqual(r.grupos, 1);
  assert.strictEqual(r.pagamentosAMais, 1);
  assert.strictEqual(r.total, 1004);
  assert.strictEqual(r.confirmadoNoExtrato.n, 1);
});

test("pagamento a mais sem débito no extrato não entra no confirmado", () => {
  const cp = [pago("A", "1", 100, "2026-10-01"), pago("B", "1", 100, "2026-10-02")];
  const r = calcular({ cp, forn: f }, []);
  assert.strictEqual(r.total, 100);
  assert.strictEqual(r.confirmadoNoExtrato.n, 0);
});

test("pagamento por outro banco conta no total mas não é conferido no extrato do Meridiano", () => {
  const cp = [pago("A", "1", 100, "2026-10-01"), pago("B", "1", 100, "2026-10-02", { banco_pagador: "Banco Litoral" })];
  const r = calcular({ cp, forn: f }, []);
  assert.strictEqual(r.total, 100);
  assert.strictEqual(r.litoral.n, 1);
  assert.strictEqual(r.meridiano.n, 0);
});
