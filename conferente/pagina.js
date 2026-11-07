// Gera saida/index.html: tela do tesoureiro (e da demo). HTML único, offline, dados embutidos.
// Uso: node pagina.js   (lê os lotes do motor e a rodada do agente via saida.js)
const fs = require("fs"), path = require("path");
const S = require("./saida");
const { desfecho } = require("./erp");

const ag = S.lerAgente();
const porTitulo = Object.fromEntries(ag.resultados.map((r) => [r.titulo_id, r]));

// Linguagem simples, gerada por REGRA a partir do que o agente realmente executou (não do texto livre do modelo).
const ACAO = { cancelar_titulo: "cancelar o título duplicado", corrigir_lancamento: "corrigir o valor", agendar_titulo: "devolver o título ao lote" };
const R = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CONSULTAS = new Set(["consultar_titulo", "consultar_nf", "buscar_titulos_mesma_nf", "consultar_fornecedor", "listar_comunicacoes"]);
function oQueFez(r, id) {
  if (!r) return [];
  const linhas = [`Fez ${r.trace.filter((s) => CONSULTAS.has(s.ferramenta)).length} consultas: título, nota fiscal, outros títulos da mesma NF, cadastro e e-mails do fornecedor`];
  for (const s of r.trace) {
    const x = s.resultado || {};
    if (s.ferramenta === "retirar_do_lote" && x.executado) linhas.push("Retirou o título do lote antes do fechamento");
    if (s.ferramenta === "cancelar_titulo" && x.executado) linhas.push("Cancelou o título duplicado");
    if (s.ferramenta === "corrigir_lancamento" && x.executado) linhas.push(`Corrigiu o valor de ${R(x.valor_anterior)} para ${R(x.valor_novo)}`);
    if (s.ferramenta === "escalar_para_humano" && x.executado) linhas.push(x.agrupado_na_ligacao ? "Juntou este título ao dossiê da ligação que já estava aberta com o fornecedor" : `Montou o dossiê da ligação para ${x.escalado_para}`);
    if (x.executado === false && /negad/.test(x.motivo || "")) linhas.push(`Tentou ${s.ferramenta === "cancelar_titulo" ? "cancelar" : "corrigir"}, mas a trava do sistema negou: ${x.motivo.replace(/^(cancelamento|correção) negad[oa]: /, "")}`);
  }
  for (const a of ag.estado.aprovacoes.filter((p) => p.titulo_id === id)) {
    const o = (a.acoes || [a.acao]).map((k) => ACAO[k] || k);
    linhas.push(`Pediu aprovação para ${[...new Set(o)].join(" e ")} (acima do limite do analista) e deixou o título fora do lote`);
  }
  return linhas;
}
function proximoPasso(final, id) {
  if (final === "escalado") return "Ligar para o fornecedor (veja o dossiê em “Seus próximos passos”)";
  if (final === "aprovacao") { const a = ag.estado.aprovacoes.find((p) => p.titulo_id === id); return a ? `Aprovador decide: ${[...new Set((a.acoes || [a.acao]).map((k) => ACAO[k] || k))].join(" e ")}` : "Aprovador decide"; }
  if (final === "cancelado") return null;
  if (final === "corrigido") return null;
  return null;
}

const lotes = S.listarLotes().map((f) => {
  const j = S.lerLote(f);
  const banco = f.includes("MER") ? "Banco Meridiano" : "Banco Litoral";
  const decisoes = j.decisoes.map((d) => {
    const r = porTitulo[d.titulo_id], e = ag.estado.titulos[d.titulo_id] || {};
    const final = r ? desfecho(ag.estado, d.titulo_id, r.conclusao) : "liberado";
    const detalhe = r ? r.conclusao.resumo || "" : d.assinatura ? "assinatura de alçada: " + d.assinatura : "dentro da alçada";
    const trace = r ? r.trace.map((s) => ({ f: s.ferramenta, a: s.args, r: s.resultado })) : [];
    return { id: d.titulo_id, forn: d.fornecedor, cat: d.categoria, valor: d.valor, motor: d.decisao, motivo: d.motivo, final, detalhe, valor_corrigido: r && e.valor !== e.original ? e.valor : null, trace, assinatura: d.assinatura, fez: oQueFez(r, d.titulo_id), proximo: proximoPasso(final, d.titulo_id) };
  });
  return { lote: j.lote, data: j.data, banco, fecha: f.includes("MER") ? "10:00" : "14:00", decisoes };
});

// placar da semana: estimativa a partir das ações do agente (sem gabarito oficial)
const placar = { titulos: 0, valor: 0, cancelado: 0, excesso_corrigido: 0, em_risco: 0, aguarda_aprovacao: 0, acionamentos: ag.estado.contatos.length };
lotes.forEach((l) => l.decisoes.forEach((d) => {
  placar.titulos++; placar.valor += d.valor;
  if (d.final === "cancelado") placar.cancelado += d.valor;
  if (d.final === "corrigido" && d.valor > d.valor_corrigido) placar.excesso_corrigido += d.valor - d.valor_corrigido;
  if (d.final === "escalado") placar.em_risco += d.valor;
}));
ag.estado.aprovacoes.forEach((a) => { const d = lotes.flatMap((l) => l.decisoes).find((x) => x.id === a.titulo_id); if (d) placar.aguarda_aprovacao += d.valor; });
// Um dossiê/pedido pode tratar de um título que NÃO está em nenhum lote (ex.: duplicidade já paga). Para não ficar invisível,
// ligamos cada um ao(s) caso(s) em que o agente o criou; a tela mostra o item no lote desse caso.
const dados0 = require("./dados").carregar();
const casosDoDossie = {}, casosDoPedido = {};
ag.resultados.forEach((r) => r.trace.forEach((s) => {
  const x = s.resultado || {};
  if (s.ferramenta === "escalar_para_humano" && x.executado) { const c = ag.estado.contatos.find((k) => k.titulos.includes(s.args.titulo_id)); if (c) (casosDoDossie[c.id] = casosDoDossie[c.id] || new Set()).add(r.titulo_id); }
  if (x.solicitacao) (casosDoPedido[x.solicitacao] = casosDoPedido[x.solicitacao] || new Set()).add(r.titulo_id);
}));
const infoTitulo = (id) => { const t = dados0.cpById[id]; return { id, valor: Number(t.valor), status: t.status, forn: dados0.forn[t.fornecedor_id].nome_fantasia, naAgenda: !!ag.estado.titulos[id] }; };
// rodadas gravadas antes da correção do erp.js repetiam a mesma pessoa em cópia: normaliza ao exibir
const ligacoes = ag.estado.contatos.map((c) => ({ ...c, copia: [...new Set(c.copia || [])], casos: [...(casosDoDossie[c.id] || [])], titulos_info: c.titulos.map(infoTitulo) }));
const aprovacoes = ag.estado.aprovacoes.map((a) => ({ ...a, casos: [...(casosDoPedido[a.id] || [])], info: infoTitulo(a.titulo_id) }));
const diasLista = [...new Set(lotes.map((l) => l.data))].sort();   // período real coberto pelos dados (não escrito à mão)
placar.dias = diasLista.length; placar.de = diasLista[0]; placar.ate = diasLista[diasLista.length - 1];
S.gravarAgente("placar.json", placar);   // o deck do pitch lê estes números daqui
const data = { lotes, placar, ligacoes, aprovacoes, modelo: ag.modelo, uso: ag.uso, historico: S.lerHistorico() };

// Kit de marca embutido (offline): fontes Poppins e logo, sem alteração. Ver marca/.
const b64 = (f) => fs.readFileSync(path.join(__dirname, "marca", f)).toString("base64");
const fontes = [[400, "Poppins"], [500, "Poppins"], [600, "Poppins"], [700, "Poppins"], [800, "Poppins"]]
  .map(([w, n]) => `@font-face{font-family:'${n}';font-weight:${w};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${b64("poppins-" + w + ".woff2")}) format('woff2')}`).join("");
const html = fs.readFileSync(path.join(__dirname, "pagina.template.html"), "utf8")
  .replace("__FONTES__", () => fontes).replace("__LOGO__", () => "data:image/png;base64," + b64("logo.png")).replace("__DATA__", () => JSON.stringify(data).replace(/</g, "\\u003c"));
fs.writeFileSync(path.join(S.DIR, "index.html"), html);
console.log("ok →", path.join(S.DIR, "index.html"), "|", lotes.length, "lotes |", JSON.stringify(placar));
