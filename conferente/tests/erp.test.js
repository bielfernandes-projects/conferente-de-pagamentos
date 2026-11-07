// Testes das TRAVAS do ERP simulado. Rodam sem IA e sem rede: node --test tests/
// Cada caso vem de uma rodada real (ver VERIFICACAO.md); os títulos são os da base sintética.
const test = require("node:test");
const assert = require("node:assert");
const { novoAmbiente } = require("../erp");

// Estes testes usam títulos reais do desafio: precisam da base em base-de-dados/ (ver README). Sem ela, são pulados, não falham.
if (!require("fs").existsSync(require("path").join(__dirname, "..", "..", "base-de-dados", "GoHacks_Talent_2026_bases_csv", "pagamentos", "fornecedores.csv"))) { test("(pulado) precisa da base do desafio em base-de-dados/", { skip: true }, () => {}); return; }
const ev = "teste";

test("cancelar título legítimo (sem gêmeo mais antigo) é negado", () => {
  const { F } = novoAmbiente();
  const r = F.cancelar_titulo({ titulo_id: "TP431396", motivo: "x", evidencias: ev });
  assert.strictEqual(r.executado, false);
  assert.match(r.motivo, /negado/);
});

test("cancelar duplicata real abaixo da alçada executa", () => {
  const { F, estado } = novoAmbiente();
  assert.strictEqual(F.cancelar_titulo({ titulo_id: "TP429865", motivo: "dup", evidencias: ev }).executado, true);
  assert.strictEqual(estado.titulos.TP429865.status, "cancelado");
});

test("duplicata com erro de digitação de R$ 4,50 (0,5%) também é cancelável: TP430389 x TP430116", () => {
  const { F } = novoAmbiente();
  assert.strictEqual(F.cancelar_titulo({ titulo_id: "TP430389", motivo: "dup", evidencias: ev }).executado, true);
});

test("cancelar acima da alçada vira pedido de aprovação e retém o título fora do lote", () => {
  const { F, estado } = novoAmbiente();
  const r = F.cancelar_titulo({ titulo_id: "TP432119", motivo: "dup", evidencias: ev });
  assert.strictEqual(r.executado, false);
  assert.ok(r.solicitacao);
  assert.strictEqual(r.titulo_retido_fora_do_lote, true);
  assert.strictEqual(estado.titulos.TP432119.status, "retirado");
});

test("pedidos de aprovação são únicos por título", () => {
  const { F, estado } = novoAmbiente();
  F.cancelar_titulo({ titulo_id: "TP430213", motivo: "dup", evidencias: ev });
  F.agendar_titulo({ titulo_id: "TP430213", lote_remessa: "RM20261103-MER" });
  assert.strictEqual(estado.aprovacoes.length, 1);
  assert.deepStrictEqual(estado.aprovacoes[0].acoes, ["cancelar_titulo", "agendar_titulo"]);
});

test("corrigir zero a menos dentro da alçada executa", () => {
  const { F, estado } = novoAmbiente();
  const r = F.corrigir_lancamento({ titulo_id: "TP431634", campo: "valor", valor_novo: 2406.36, evidencias: ev });
  assert.strictEqual(r.executado, true);
  assert.strictEqual(estado.titulos.TP431634.valor, 2406.36);
});

test("corrigir para um valor que deixaria o título idêntico a outro mais antigo é negado", () => {
  const { F } = novoAmbiente();
  const r = F.corrigir_lancamento({ titulo_id: "TP432119", campo: "valor", valor_novo: 9986.71, evidencias: ev });
  assert.strictEqual(r.executado, false);
  assert.match(r.motivo, /idêntico a TP431674/);
});

test("ação de escrita sem evidência é negada", () => {
  const { F } = novoAmbiente();
  assert.match(F.corrigir_lancamento({ titulo_id: "TP431634", campo: "valor", valor_novo: 2406.36, evidencias: "" }).motivo, /evidências/);
  assert.match(F.cancelar_titulo({ titulo_id: "TP429865", motivo: "x", evidencias: " " }).motivo, /evidências/);
});

test("escalar: mesmo fornecedor é uma ligação só, com a outra pessoa em cópia e custo adicional zero", () => {
  const { F, estado } = novoAmbiente();
  const base = { motivo: "troca de conta sem confirmação", evidencias: "alteração de 30/10 por e-mail" };
  const a = F.escalar_para_humano({ ...base, pessoa_id: "PS01", titulo_id: "TP431502" });
  const b = F.escalar_para_humano({ ...base, pessoa_id: "PS08", titulo_id: "TP432024" });
  assert.strictEqual(estado.contatos.length, 1);
  assert.strictEqual(b.custo_adicional_rs, 0);
  assert.strictEqual(b.agrupado_na_ligacao, estado.contatos[0].id);
  assert.deepStrictEqual(estado.contatos[0].titulos, ["TP431502", "TP432024"]);
  assert.match(estado.contatos[0].copia[0], /Lívia Campos/);
  assert.strictEqual(estado.titulos.TP431502.status, "retirado");
  assert.strictEqual(estado.titulos.TP432024.status, "retirado");
  assert.strictEqual(a.titulo_retirado_do_lote_pelo_sistema, true);
});

test("escalar: a mesma pessoa em cópia aparece UMA vez, por mais títulos que cheguem (bug visto na página: 5x Lívia Campos)", () => {
  const { F, estado } = novoAmbiente();
  const base = { motivo: "troca de conta sem confirmação", evidencias: "alteração de 30/10 por e-mail" };
  F.escalar_para_humano({ ...base, pessoa_id: "PS01", titulo_id: "TP431502" });
  for (const id of ["TP432024", "TP431243", "TP431429"]) F.escalar_para_humano({ ...base, pessoa_id: "PS08", titulo_id: id });
  F.escalar_para_humano({ ...base, pessoa_id: "PS03", titulo_id: "TP432037" });
  assert.strictEqual(estado.contatos.length, 1);
  assert.strictEqual(estado.contatos[0].titulos.length, 5);
  assert.strictEqual(estado.contatos[0].copia.length, 2);   // Lívia (PS08) e Helena (PS03), cada uma uma vez
});

test("escalar: o telefone é sempre o do cadastro e pessoa inválida é negada", () => {
  const { F, estado } = novoAmbiente();
  const r = F.escalar_para_humano({ pessoa_id: "PS01", titulo_id: "TP431502", motivo: "x", evidencias: "y", perguntas_para_a_ligacao: "ligue para (11) 99999-0000" });
  assert.strictEqual(r.executado, true);
  assert.match(estado.contatos[0].ligar_para, /telefone do cadastro/);
  assert.doesNotMatch(estado.contatos[0].ligar_para, /99999-0000/);
  assert.strictEqual(F.escalar_para_humano({ pessoa_id: "PS99", titulo_id: "TP431502", motivo: "x", evidencias: "y" }).executado, false);
});

test("o agente não tem ferramenta para aprovar nem para falar com o fornecedor", () => {
  const { F } = novoAmbiente();
  for (const proibida of ["aprovar_acao", "liberar_lote", "contatar_fornecedor", "aprovar_alteracao_bancaria"]) assert.strictEqual(F[proibida], undefined, proibida);
});

test("continuar de uma rodada anterior: o estado se mantém, o mesmo fornecedor segue na MESMA ligação e o original não muda", () => {
  const a = novoAmbiente();
  a.F.escalar_para_humano({ pessoa_id: "PS01", titulo_id: "TP431502", motivo: "m", evidencias: "e" });
  a.F.cancelar_titulo({ titulo_id: "TP429865", motivo: "dup", evidencias: ev });
  const b = novoAmbiente(undefined, a.estado);                 // outro dia, retomando do estado anterior
  assert.strictEqual(b.estado.titulos.TP429865.status, "cancelado");
  assert.strictEqual(b.estado.titulos.TP431502.status, "retirado");
  const r = b.F.escalar_para_humano({ pessoa_id: "PS01", titulo_id: "TP432024", motivo: "m", evidencias: "e" });
  assert.strictEqual(r.custo_adicional_rs, 0);                 // mesmo fornecedor: sem novo acionamento de R$ 60
  assert.strictEqual(b.estado.contatos.length, 1);
  assert.strictEqual(b.estado.contatos[0].titulos.length, 2);
  assert.strictEqual(a.estado.contatos[0].titulos.length, 1);  // o estado anterior foi copiado, não alterado
});
