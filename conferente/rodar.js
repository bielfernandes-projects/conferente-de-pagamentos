// Um comando só: motor → agente → página, e registra a execução no histórico.
//   node rodar.js 20261103                 (um dia: lotes MER e LIT daquela data)
//   node rodar.js 20261103 20261104 ...    (vários dias)
//   node rodar.js --registrar-existente    (só registra no histórico o saida/agente_semana.json que já existe, sem rodar a IA)
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const D = require("./dados");
const S = require("./saida");
const P = require("./politica");
const { desfecho } = require("./erp");
const run = (...a) => { const r = spawnSync(process.execPath, a, { cwd: __dirname, stdio: "inherit" }); if (r.status !== 0) { console.error("falhou:", a.join(" ")); process.exit(1); } };

const args = process.argv.slice(2);
const soRegistrar = args.includes("--registrar-existente");
const continuar = args.includes("--continuar");   // acrescenta estes dias à rodada anterior, sem refazer nem sobrescrever o que já foi verificado
const dias = args.filter((a) => /^\d{8}$/.test(a));
if (!soRegistrar && !dias.length) { console.error("uso: node rodar.js 20261103 [20261104 ...]  |  node rodar.js --continuar 20261111 ...  |  --registrar-existente"); process.exit(1); }

if (!soRegistrar) {
  const lotes = [...new Set(D.carregar().agenda.map((x) => x.lote_remessa))].filter((l) => dias.includes(l.slice(2, 10)));
  if (!lotes.length) { console.error("nenhum lote na agenda para essas datas"); process.exit(1); }
  console.log("1/3 motor de regras:", lotes.join(", "));
  lotes.forEach((l) => run("engine.js", l));
  console.log("\n2/3 agente (investiga e age nos casos suspeitos)");
  run("agente.js", "--lotes", dias.join(","), ...(continuar ? ["--continuar"] : []));
}

// registro no histórico
if (!S.existe("agente_semana.json")) { console.error("sem saida/agente_semana.json"); process.exit(1); }
const ag = S.lerAgente();
const quando = soRegistrar ? fs.statSync(path.join(S.DIR, "agente_semana.json")).mtime : new Date();
const snap = "agente_" + quando.toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".json";
S.copiarParaHistorico("agente_semana.json", snap);
// O histórico registra só o que ESTA execução fez (em --continuar, os casos, ligações e tokens novos; senão, tudo)
const rod = ag.ultimaRodada && ag.ultimaRodada.continuou ? ag.ultimaRodada : null;
const resRodada = rod ? ag.resultados.filter((r) => rod.casos.includes(r.titulo_id)) : ag.resultados;
const desfechos = resRodada.map((r) => desfecho(ag.estado, r.titulo_id, r.conclusao));
const doAgente = new Set(resRodada.map((r) => r.titulo_id));
let total = 0, liberados = 0;
S.listarLotes(P.LOTES_ATE).map(S.lerLote).filter((j) => !dias.length || dias.some((d) => j.lote.includes(d))).forEach((j) => {
  total += j.decisoes.length; liberados += j.decisoes.filter((d) => !doAgente.has(d.titulo_id) && !(ag.resultados.some((r) => r.titulo_id === d.titulo_id))).length;
});
const uso = rod ? rod.uso : ag.uso;
const entrada = {
  quando: quando.toISOString(), lotes: dias.length ? dias : "registro de rodada existente", continuou: !!rod, modelo: ag.modelo,
  titulos: total, liberados, casos_do_agente: resRodada.length,
  cancelados: desfechos.filter((x) => x === "cancelado").length, corrigidos: desfechos.filter((x) => x === "corrigido").length,
  ligacoes: ag.estado.contatos.length - (rod ? rod.antes.contatos : 0), aprovacoes: ag.estado.aprovacoes.length - (rod ? rod.antes.aprovacoes : 0), casos_sem_resolver: (ag.erros || []).length,
  chamadas_ia: uso.chamadas, tokens_entrada: uso.ent, tokens_saida: uso.sai, snapshot: "historico/" + snap,
};
S.anexarHistorico(entrada);
console.log("\nregistrado no histórico:", JSON.stringify(entrada));
console.log("3/3 página");
run("pagina.js");
