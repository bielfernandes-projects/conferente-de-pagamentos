// O laço do agente com um "chat" falso (segundo adapter do seam): prova as travas sem gastar chamada de IA.
// As trilhas em tests/fixtures/ são tool calls REAIS de rodadas do agente (ver VERIFICACAO.md).
const test = require("node:test");
const assert = require("node:assert");
const { resolver } = require("../agente");
const { novoAmbiente, desfecho } = require("../erp");

// chat que devolve, uma por vez, as chamadas de ferramenta de um roteiro; ao acabar o roteiro, conclui.
function chatRoteirizado(calls) {
  const fila = [...calls]; let n = 0;
  return async () => {
    const c = fila.shift() || { ferramenta: "concluir_caso", args: { resultado: "aguarda_humano", resumo: "fim do roteiro" } };
    return { usage: { prompt_tokens: 10, completion_tokens: 5 }, choices: [{ message: { content: "", tool_calls: [{ id: "c" + n++, function: { name: c.ferramenta, arguments: JSON.stringify(c.args) } }] } }] };
  };
}
const rodar = (id, calls) => {
  const ambiente = novoAmbiente(), uso = { ent: 0, sai: 0, chamadas: 0 };
  return resolver(ambiente, id, "teste", uso, chatRoteirizado(calls)).then((r) => ({ r, ambiente, uso }));
};
const fixture = (nome) => require("./fixtures/" + nome);

test("REGRESSÃO do incidente: o agente retirou e depois CANCELOU o título legítimo TP431396 (Embalarte); hoje o cancelamento é negado", async () => {
  const fx = fixture("incidente_cancelou_titulo_legitimo.json");
  const { r, ambiente } = await rodar(fx.titulo_id, fx.calls);
  const cancel = r.trace.find((s) => s.ferramenta === "cancelar_titulo");
  assert.ok(cancel, "a trilha real tem o cancelamento");
  assert.strictEqual(cancel.resultado.executado, false);
  assert.notStrictEqual(ambiente.estado.titulos.TP431396.status, "cancelado");
  assert.strictEqual(ambiente.estado.titulos.TP431396.status, "retirado");     // segue fora do lote, aguardando a ligação
  assert.strictEqual(ambiente.estado.contatos.length, 1);                         // e o dossiê para o humano existe
});

test("REGRESSÃO: zero a menos (TP431634) é corrigido para a duplicata da NF", async () => {
  const fx = fixture("zero_a_menos_corrigido.json");
  const { ambiente } = await rodar(fx.titulo_id, fx.calls);
  assert.strictEqual(ambiente.estado.titulos.TP431634.valor, 2406.36);
  assert.strictEqual(desfecho(ambiente.estado, "TP431634", null), "corrigido");
});

test("ferramenta que o agente não tem (aprovar, liberar lote, ligar) não executa nada", async () => {
  const { r, ambiente } = await rodar("TP429865", [
    { ferramenta: "aprovar_acao", args: { solicitacao_id: "SOL1" } },
    { ferramenta: "liberar_lote", args: { lote_remessa: "RM20261103-MER" } },
    { ferramenta: "contatar_fornecedor", args: { fornecedor_id: "FP5940", mensagem: "oi" } },
  ]);
  assert.deepStrictEqual(r.trace.slice(0, 3).map((s) => s.resultado.erro), ["ferramenta inexistente", "ferramenta inexistente", "ferramenta inexistente"]);
  assert.strictEqual(ambiente.estado.acoes.length, 0);
  assert.strictEqual(ambiente.estado.titulos.TP429865.status, "agendado");
});

test("o uso de tokens e chamadas é contabilizado a cada passo", async () => {
  const { uso } = await rodar("TP429865", [{ ferramenta: "consultar_titulo", args: { titulo_id: "TP429865" } }]);
  assert.strictEqual(uso.chamadas, 2);           // consulta + conclusão
  assert.strictEqual(uso.ent, 20);
});

test("modelo que responde só texto, sem concluir, é registrado como sem_conclusao (não trava o laço)", async () => {
  const ambiente = novoAmbiente();
  const chat = async () => ({ usage: { prompt_tokens: 1, completion_tokens: 1 }, choices: [{ message: { content: "acho que está tudo certo" } }] });
  const r = await resolver(ambiente, "TP429865", "teste", { ent: 0, sai: 0, chamadas: 0 }, chat);
  assert.strictEqual(r.conclusao.resultado, "sem_conclusao");
});

test("desfecho: cancelado, aprovação, escalado, corrigido, agente e liberado", () => {
  const estado = { titulos: { A: { status: "cancelado", valor: 1, original: 1 }, B: { status: "retirado", valor: 1, original: 1 }, C: { status: "retirado", valor: 1, original: 1 },
    D: { status: "agendado", valor: 2, original: 1 }, E: { status: "agendado", valor: 1, original: 1 } }, aprovacoes: [{ titulo_id: "B" }] };
  assert.strictEqual(desfecho(estado, "A"), "cancelado");
  assert.strictEqual(desfecho(estado, "B"), "aprovacao");
  assert.strictEqual(desfecho(estado, "C"), "escalado");
  assert.strictEqual(desfecho(estado, "D"), "corrigido");
  assert.strictEqual(desfecho(estado, "E", { resultado: "resolvido" }), "agente");
  assert.strictEqual(desfecho(estado, "E", { resultado: "aguarda_humano" }), "aprovacao");
  assert.strictEqual(desfecho(estado, "Z"), "liberado");
});
