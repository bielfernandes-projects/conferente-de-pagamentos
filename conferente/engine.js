// Conferente de Pagamentos: motor de regras (só código, sem LLM).
//   como módulo:  const { classificar } = require("./engine");  classificar("RM20261103-MER") -> { lote, data, decisoes }
//   na linha de comando:  node engine.js [lote]  (padrão RM20261103-MER) -> grava saida/<lote>.json
const P = require("./politica");
const T = require("./titulos");
const D = require("./dados");
const S = require("./saida");

const num = Number;
const R$ = (v) => "R$ " + num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const isoDia = (s) => s.slice(0, 10);
const diasEntre = (a, b) => (new Date(a) - new Date(b)) / 864e5;

function classificar(LOTE, dados = D.carregar()) {
  const { forn, cp, cpById, nfs, dups, oc } = dados;
  const agenda = dados.agenda.filter((x) => x.lote_remessa === LOTE);
  if (!agenda.length) throw new Error("lote sem títulos na agenda: " + LOTE);
  const alt = D.agrupar(dados.alt, (x) => x.fornecedor_id);
  const nfPorNumero = D.agrupar(nfs, (x) => T.normNF(x.numero_nf));
  const porForn = D.agrupar(cp, (x) => x.fornecedor_id);
  const dataLote = agenda[0].data_prevista;

  // bancos de cobrança que cada fornecedor já usou em boletos pagos
  const bancosUsados = {};
  cp.filter((x) => x.status === "pago" && x.forma_pagamento === "boleto" && x.linha_digitavel).forEach((x) => {
    (bancosUsados[x.fornecedor_id] = bancosUsados[x.fornecedor_id] || new Set()).add(x.linha_digitavel.slice(0, 3));
  });

  const decisoes = agenda.map((a) => {
    const t = cpById[a.titulo_id];
    const f = forn[t.fornecedor_id];
    const bloqueios = [], atencao = [], dupla = [];
    const valor = num(t.valor);
    const cat = f.categoria;
    const nfNum = T.normNF(t.numero_nf_digitado);

    // 1. duplicidade: regra única (titulos.js). Já pago em qualquer data, ou ainda vivo e lançado antes
    if (nfNum) {
      const irmaos = T.gemeos(t, porForn[t.fornecedor_id] || []);
      const pago = irmaos.find((x) => x.status === "pago");
      const outro = irmaos.find((x) => x.status !== "pago" && T.maisAntigo(t)(x));
      if (pago) bloqueios.push(`duplicidade: NF ${nfNum} parc. ${t.parcela} já paga no título ${pago.titulo_id}`);
      else if (outro) bloqueios.push(`duplicidade: mesma NF/parcela/valor do título ${outro.titulo_id}, lançado antes`);
    }

    // 2. NF no portal + fornecedor (raiz do CNPJ) + duplicata
    let nf = null, dp = null;
    if (!nfNum) {
      if (cat !== "aluguel") dupla.push("pagamento sem NF");
    } else {
      const cands = (nfPorNumero[nfNum] || []).filter((x) => T.raizCnpj(x.cnpj_emitente) === T.raizCnpj(f.cnpj));
      nf = cands[0];
      if (!nf) {
        const outra = (nfPorNumero[nfNum] || [])[0];
        if (outra) bloqueios.push(`NF ${nfNum} existe no portal, mas de outro emitente (${outra.razao_social_emitente}), não de ${f.nome_fantasia}`);
        else atencao.push(`NF ${nfNum} não encontrada no portal NF-e`);
      } else {
        const [n] = t.parcela.split("/");
        dp = (dups[nf.chave_acesso] || []).find((d) => String(num(d.n_dup)) === String(num(n)));
        if (dp) {
          const dif = valor - num(dp.valor);
          const dias = Math.max(0, diasEntre(dataLote, isoDia(dp.vencimento)));
          if (dif > P.acrescimoMaximo(dp.valor, dias)) bloqueios.push(`título ${R$(valor)} acima da duplicata ${R$(dp.valor)} (+${R$(dif)})`);
          else if (dif < -P.TITULO_X_DUPLICATA) atencao.push(`título ${R$(valor)} abaixo da duplicata ${R$(dp.valor)}`);
        }
        // NF x OC
        const o = oc[t.oc_id];
        if (cat !== "utilidades") {
          if (!t.oc_id || !o) dupla.push("sem OC informada");
          else if (o.status !== "aprovada") dupla.push(`OC ${o.oc_id} está ${o.status}`);
          else {
            const base = o.tipo === "contrato" ? num(o.valor_mensal) : num(o.valor_total);
            if (o.tipo !== "contrato" && num(nf.valor_total) > P.limiteOC(base)) atencao.push(`NF ${R$(nf.valor_total)} acima da OC ${R$(base)} além da tolerância`);
          }
        }
      }
    }

    // 3. boleto: beneficiário e banco de cobrança
    if (t.forma_pagamento === "boleto") {
      if (t.cnpj_beneficiario_boleto && T.raizCnpj(t.cnpj_beneficiario_boleto) !== T.raizCnpj(f.cnpj))
        bloqueios.push(`boleto com beneficiário ${t.cnpj_beneficiario_boleto}, diferente do fornecedor (${f.cnpj})`);
      const bancoBoleto = (t.linha_digitavel || "").slice(0, 3);
      const usados = bancosUsados[t.fornecedor_id];
      if (bancoBoleto && usados && usados.size && !usados.has(bancoBoleto) && bancoBoleto !== f.banco)
        bloqueios.push(`boleto do banco ${bancoBoleto}, que este fornecedor nunca usou (usa ${[...usados].join("/")})`);
    }

    // 4. troca de dados bancários recente sem confirmação (afeta ted/pix e boleto novo)
    const trocas = (alt[t.fornecedor_id] || []).filter((x) => P.CAMPOS_BANCARIOS.includes(x.campo)
      && diasEntre(dataLote, isoDia(x.data_hora)) <= P.TROCA_BANCARIA_DIAS && x.confirmacao_registrada !== "sim");
    if (trocas.length) bloqueios.push(`dados bancários alterados em ${isoDia(trocas[0].data_hora)} (origem: ${trocas[0].origem}) sem confirmação registrada`);

    // 5. antecipação
    if (t.vencimento > dataLote) dupla.push(`antecipação: vence ${t.vencimento}`);

    // decisão
    const al = P.alcada(valor);
    let decisao, motivo, aprovador = al.quem;
    if (bloqueios.length) { decisao = "bloqueia"; motivo = bloqueios.join("; "); aprovador = "PS01 coordenadora (suspeita/erro de lançamento)"; }
    else if (dupla.length) { decisao = "segura"; motivo = "aprovação dupla: " + dupla.join("; "); aprovador = "aprovador + PS01"; }
    else if (atencao.length) { decisao = "segura"; motivo = atencao.join("; "); }
    else { decisao = "libera"; motivo = "conferência ok"; }
    // assinatura de alçada é rotina (todo pago >R$ 5 mil no histórico tem aprovador): vai num aviso único por aprovador, não por título
    const assinatura = decisao === "libera" && al.nivel !== "analista_cp" ? al.quem : null;
    return { titulo_id: t.titulo_id, fornecedor: f.nome_fantasia, categoria: cat, valor, vencimento: t.vencimento, forma: t.forma_pagamento, decisao, motivo, aprovador, alcada: al.nivel, assinatura, _chk: { nf: !!nf, dup: !!dp, oc: !!oc[t.oc_id], semNF: !nfNum } };
  });
  return { lote: LOTE, data: dataLote, decisoes };
}

module.exports = { classificar };

if (require.main === module) {
  const res = classificar(process.argv[2] || "RM20261103-MER");
  S.escreverLote(res);
  const ds = res.decisoes;
  const soma = (d) => ds.filter((x) => x.decisao === d).reduce((s, x) => s + x.valor, 0);
  for (const d of ["libera", "segura", "bloqueia"]) console.log(d.padEnd(9), String(ds.filter((x) => x.decisao === d).length).padStart(4), R$(soma(d)));
  console.log("total    ", ds.length, R$(ds.reduce((s, x) => s + x.valor, 0)));
  const c = (f) => ds.filter((x) => f(x._chk)).length;
  console.log(`cobertura: NF achada ${c((k) => k.nf)} | duplicata achada ${c((k) => k.dup)} | OC achada ${c((k) => k.oc)} | sem NF ${c((k) => k.semNF)} de ${ds.length}`);
  const ass = ds.filter((x) => x.assinatura);
  console.log(`assinaturas de rotina: ${ass.length} títulos, ${R$(ass.reduce((s, x) => s + x.valor, 0))}`);
}
