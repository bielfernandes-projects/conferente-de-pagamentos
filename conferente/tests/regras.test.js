// Política, regra de duplicidade e motor, sem CSV: o motor roda sobre dados em memória (segundo adapter do seam de dados).
const test = require("node:test");
const assert = require("node:assert");
const P = require("../politica");
const T = require("../titulos");
const D = require("../dados");
const { classificar } = require("../engine");

test("alçada: fronteiras de R$ 5.000 e R$ 50.000", () => {
  assert.strictEqual(P.alcada(5000).nivel, "analista_cp");
  assert.strictEqual(P.alcada(5000.01).nivel, "aprovador");
  assert.strictEqual(P.alcada(50000).nivel, "aprovador");
  assert.strictEqual(P.alcada(50000.01).nivel, "diretoria");
});

test("tolerância de duplicidade: 1% do valor, no mínimo R$ 0,01", () => {
  assert.strictEqual(P.toleranciaDuplicata(10000), 100);
  assert.strictEqual(P.toleranciaDuplicata(0.5), 0.01);
});

test("multa e juros só entram depois de 3 dias de atraso", () => {
  assert.strictEqual(P.acrescimoMaximo(1000, 3), 0.1);
  assert.ok(P.acrescimoMaximo(1000, 30) > 30);
});

test("NF normalizada: zeros à esquerda e série são a mesma NF", () => {
  for (const x of ["123", "000123", "123-1", "123/2", "0123"]) assert.strictEqual(T.normNF(x), "123");
  assert.strictEqual(T.normNF(""), "");
});

test("CNPJ de filial tem a mesma raiz de 8 dígitos", () => {
  assert.strictEqual(T.raizCnpj("85.779.751/0001-00"), T.raizCnpj("85779751000234"));
});

test("gemeos: mesma NF e parcela com até 1% de diferença; parcela diferente ou cancelado não contam", () => {
  const t = { titulo_id: "A", fornecedor_id: "F", numero_nf_digitado: "000123", parcela: "1/2", valor: "1000", status: "agendado" };
  const outros = [
    { titulo_id: "B", fornecedor_id: "F", numero_nf_digitado: "123-1", parcela: "1/2", valor: "1004", status: "aberto" },      // 0,4%: gêmeo
    { titulo_id: "C", fornecedor_id: "F", numero_nf_digitado: "123", parcela: "2/2", valor: "1000", status: "aberto" },        // outra parcela
    { titulo_id: "D", fornecedor_id: "F", numero_nf_digitado: "123", parcela: "1/2", valor: "1020", status: "aberto" },        // 2%: fora
    { titulo_id: "E", fornecedor_id: "F", numero_nf_digitado: "123", parcela: "1/2", valor: "1000", status: "cancelado" },     // cancelado
    { titulo_id: "G", fornecedor_id: "OUTRO", numero_nf_digitado: "123", parcela: "1/2", valor: "1000", status: "aberto" },    // outro fornecedor
  ];
  assert.deepStrictEqual(T.gemeos(t, outros).map((x) => x.titulo_id), ["B"]);
  assert.deepStrictEqual(T.gemeos({ ...t, numero_nf_digitado: "" }, outros), []);
});

// ---- motor sobre dados em memória ----
const cnpj = { FP1: "11.222.333/0001-81", FP2: "44.555.666/0001-02", FP3: "77.888.999/0001-03" };
const f = (id, cat) => ({ fornecedor_id: id, nome_fantasia: id, categoria: cat, cnpj: cnpj[id], banco: "612" });
const tit = (id, forn, nf, over = {}) => ({ titulo_id: id, fornecedor_id: forn, numero_nf_digitado: nf, oc_id: "OC-1", parcela: "1/1", valor: "1000", vencimento: "2026-11-03", forma_pagamento: "ted",
  linha_digitavel: "", cnpj_beneficiario_boleto: "", data_lancamento: "2026-10-01 09:00:00", status: "agendado", ...over });
const nfRow = (n, forn) => ({ numero_nf: n, cnpj_emitente: cnpj[forn].replace(/\D/g, ""), chave_acesso: "K" + n, razao_social_emitente: forn, valor_total: "1000" });

function motorEmMemoria() {
  const nums = ["123", "200", "300"], donos = ["FP1", "FP2", "FP1"];
  const cp = [
    tit("T1", "FP1", "123"),                                                           // limpo
    tit("T2", "FP1", "000123-1", { valor: "1004", data_lancamento: "2026-10-05 09:00:00" }), // duplicata de T1 com erro de digitação
    tit("T3", "FP2", "200"),                                                            // troca bancária recente sem confirmação
    tit("T4", "FP1", "300", { forma_pagamento: "boleto", cnpj_beneficiario_boleto: "99.999.999/0001-99" }), // boleto de outro beneficiário
    tit("T5", "FP1", ""),                                                               // produto sem NF
    tit("T6", "FP3", "", { oc_id: "" }),                                                // aluguel sem NF
  ];
  D.usar({
    forn: { FP1: f("FP1", "produto"), FP2: f("FP2", "produto"), FP3: f("FP3", "aluguel") }, cp,
    agenda: cp.map((t) => ({ lote_remessa: "RM20261103-MER", titulo_id: t.titulo_id, data_prevista: "2026-11-03" })),
    nfs: nums.map((n, i) => nfRow(n, donos[i])), dups: Object.fromEntries(nums.map((n) => ["K" + n, [{ n_dup: "001", valor: "1000", vencimento: "2026-11-03" }]])),
    oc: { "OC-1": { oc_id: "OC-1", status: "aprovada", tipo: "pontual", valor_total: "1000" } },
    alt: [{ fornecedor_id: "FP2", campo: "conta", data_hora: "2026-10-30 10:00:00", origem: "email", confirmacao_registrada: "não" }], msgs: [],
  });
  return Object.fromEntries(classificar("RM20261103-MER").decisoes.map((d) => [d.titulo_id, d]));
}

test("motor sem CSV: título limpo é liberado", () => { assert.strictEqual(motorEmMemoria().T1.decisao, "libera"); });
test("motor sem CSV: duplicata com erro de digitação é bloqueada como duplicidade", () => { const d = motorEmMemoria().T2; assert.strictEqual(d.decisao, "bloqueia"); assert.match(d.motivo, /duplicidade.*T1/); });
test("motor sem CSV: troca bancária recente sem confirmação bloqueia", () => { const d = motorEmMemoria().T3; assert.strictEqual(d.decisao, "bloqueia"); assert.match(d.motivo, /dados bancários alterados em 2026-10-30/); });
test("motor sem CSV: boleto com beneficiário de outro CNPJ bloqueia", () => { const d = motorEmMemoria().T4; assert.strictEqual(d.decisao, "bloqueia"); assert.match(d.motivo, /beneficiário/); });
test("motor sem CSV: produto sem NF exige aprovação dupla; aluguel sem NF é dispensado", () => {
  const r = motorEmMemoria();
  assert.strictEqual(r.T5.decisao, "segura"); assert.match(r.T5.motivo, /sem NF/);
  assert.strictEqual(r.T6.decisao, "libera");
});
