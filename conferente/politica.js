// Política numérica do Conferente: UM lugar. Motor, travas do ERP, e-mails e o prompt do agente leem daqui.
// Fonte: politicas.csv e parametros.md do desafio de Pagamentos.
module.exports = {
  ALCADA_ANALISTA: 5000,          // analista libera, agenda, corrige e cancela até aqui
  ALCADA_APROVADOR: 50000,        // aprovador até aqui; acima, diretora financeira
  DUP_TOL_PCT: 0.01,              // dois títulos a até 1% de valor, mesma NF e parcela: mesmo título (erro de digitação)
  DUP_TOL_MIN: 0.01,
  TITULO_X_DUPLICATA: 0.10,       // título deve ser a duplicata, ±R$ 0,10
  MULTA: 0.02, JUROS_MES: 0.01,   // pago após o vencimento pode somar multa de 2% e juros de 1% a.m. pro rata
  OC_PCT: 0.02, OC_MIN: 50,       // NF pode passar da OC em até 2% ou R$ 50
  TROCA_BANCARIA_DIAS: 30,        // troca de dados bancários sem confirmação: risco por 30 dias
  CAMPOS_BANCARIOS: ["banco", "agencia", "conta", "chave_pix"],
  LOTES_ATE: "2026-11-13",        // último dia da base (lotes de 03/11 a 13/11)

  alcada(v) {
    if (v <= this.ALCADA_ANALISTA) return { nivel: "analista_cp", quem: "analista (alçada própria)" };
    if (v <= this.ALCADA_APROVADOR) return { nivel: "aprovador", quem: "aprovador (até R$ 50 mil)" };
    return { nivel: "diretoria", quem: "diretora financeira, Helena Duarte (PS03)" };
  },
  toleranciaDuplicata(valor) { return Math.max(this.DUP_TOL_MIN, this.DUP_TOL_PCT * Number(valor)); },
  acrescimoMaximo(valorDuplicata, diasAtraso) { // quanto o título pode passar da duplicata sem ser erro
    return Number(valorDuplicata) * (diasAtraso > 3 ? this.MULTA + this.JUROS_MES * (diasAtraso / 30) : 0) + this.TITULO_X_DUPLICATA;
  },
  limiteOC(base) { return Number(base) + Math.max(Number(base) * this.OC_PCT, this.OC_MIN); },

  // Trecho do prompt do agente, gerado daqui para o texto nunca contradizer o código.
  textoParaPrompt() {
    const p = (x) => (x * 100).toLocaleString("pt-BR") + "%";
    return [
      `- Conferência 3 vias: título = duplicata da NF (±R$ ${this.TITULO_X_DUPLICATA.toFixed(2).replace(".", ",")}); se o pagamento for depois do vencimento, o título pode somar multa de ${p(this.MULTA)} e juros de ${p(this.JUROS_MES)} ao mês pro rata; NF pode passar da OC em até ${p(this.OC_PCT)} ou R$ ${this.OC_MIN}; CNPJ do emitente com mesma raiz de 8 dígitos do fornecedor.`,
      `- Duplicidade: mesmo fornecedor, mesma NF (zeros ou série diferentes é a MESMA NF) e mesma parcela, com valor igual ou até ${p(this.DUP_TOL_PCT)} de diferença (erro de digitação). Cancele o título mais novo, nunca o já pago. O sistema só deixa cancelar se achar esse título gêmeo mais antigo.`,
      `- Alçada: você corrige, cancela ou agenda sozinho até R$ ${this.ALCADA_ANALISTA.toLocaleString("pt-BR")}; acima disso use solicitar_aprovacao. Você NUNCA aprova nada.`,
    ].join("\n");
  },
};
