// Camada 1 (código, sem IA): sinais objetivos de cada e-mail de fornecedor.
// A IA (camada 2, llm.js) só pode SUBIR o risco que esta camada calcula, nunca baixar.
const D = require("./dados");
const P = require("./politica");

const dominio = (e) => (String(e).split("@")[1] || "").toLowerCase();
const GRATIS = /^(gmail|outlook|hotmail|yahoo|live|icloud)\./;
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };

function analisarTodas(dados = D.carregar()) {
  const forn = Object.values(dados.forn), msgs = dados.msgs, alt = dados.alt;
  // domínio corporativo cadastrado -> fornecedor. E-mail gratuito (gmail etc.) NÃO identifica ninguém pelo domínio: só o endereço exato.
  const domCad = {}, enderecoCad = {};
  forn.forEach((f) => { const d = dominio(f.email_cadastrado); if (GRATIS.test(d)) enderecoCad[f.email_cadastrado.toLowerCase()] = f; else domCad[d] = f; });
  const dominiosConhecidos = Object.keys(domCad);

  function fornecedorDaMsg(m) {
    const end = m.remetente.toLowerCase(), d = dominio(end);
    if (enderecoCad[end]) return { f: enderecoCad[end], via: "endereço cadastrado" };
    if (domCad[d]) return { f: domCad[d], via: "domínio cadastrado" };
    // assinatura "Nome - Empresa": casa pelo nome fantasia
    const emp = (m.nome_remetente.split(" - ")[1] || "").toLowerCase().replace(/^financeiro /, "");
    const f = forn.find((x) => emp && x.nome_fantasia.toLowerCase().startsWith(emp.split(" ")[0]));
    return f ? { f, via: "nome na assinatura" } : { f: null, via: null };
  }

  function analisar(m) {
    const sinais = [], end = m.remetente.toLowerCase(), d = dominio(end);
    const { f, via } = fornecedorDaMsg(m);
    const texto = m.texto + " " + m.anexos;

    if (!domCad[d] && !enderecoCad[end]) {
      if (GRATIS.test(d)) sinais.push({ peso: 3, s: `remetente de e-mail gratuito (${d}), não do domínio do fornecedor` });
      else {
        const parecido = dominiosConhecidos.find((k) => lev(k, d) <= 2);
        if (parecido) sinais.push({ peso: 4, s: `domínio ${d} imita o domínio cadastrado ${parecido}` });
        else sinais.push({ peso: 2, s: `domínio ${d} não consta no cadastro de nenhum fornecedor` });
      }
    }
    if (/\.zip|\.exe|\.scr/i.test(m.anexos)) sinais.push({ peso: 4, s: "anexo compactado/executável (.zip)" });
    if (/acesse o link|informe o c[óo]digo|token/i.test(m.texto)) sinais.push({ peso: 4, s: "pede acesso a link ou código de segurança" });
    if (/assistente de ia|rob[oô] de pagamento|sistema que processa|ignore (as )?(regras|instru)|libere .* sem conferir/i.test(texto))
      sinais.push({ peso: 5, s: "contém instrução dirigida a IA/robô (dado, nunca ordem)" });
    if (/pr[eé]-aprovad|j[aá] foi validad|validada por telefone/i.test(texto)) sinais.push({ peso: 3, s: "alega aprovação/validação prévia sem prova" });

    // pedido de troca bancária
    const troca = /dados banc[aá]rios|domic[ií]lio banc[aá]rio|novos dados banc|passou a (receber|concentrar)/i.test(m.assunto + " " + m.texto);
    const bancoPedido = (texto.match(/banco (\d{3})/i) || [])[1];
    if (troca && f) {
      if (bancoPedido && bancoPedido !== f.banco) sinais.push({ peso: 1, s: `pede mudar para banco ${bancoPedido} (cadastro: ${f.banco})` });
      const reg = alt.filter((a) => a.fornecedor_id === f.fornecedor_id && P.CAMPOS_BANCARIOS.includes(a.campo) && a.data_hora >= m.data_hora.slice(0, 10));
      if (reg.some((a) => a.confirmacao_registrada !== "sim")) sinais.push({ peso: 4, s: "o cadastro JÁ foi alterado após este e-mail, sem confirmação por telefone" });
      else if (!reg.length) sinais.push({ peso: 0, s: "cadastro ainda não alterado: exigir confirmação pelo telefone do cadastro antes de mudar" });
    }
    return { id: m.comunicacao_id, data: m.data_hora, remetente: m.remetente, assunto: m.assunto, fornecedor_id: f && f.fornecedor_id, fornecedor: f && f.nome_fantasia, via, troca_bancaria: troca, banco_pedido: bancoPedido, sinais, risco: Math.min(10, sinais.reduce((s, x) => s + x.peso, 0)) };
  }
  return msgs.map(analisar);
}

module.exports = { analisarTodas };

if (require.main === module) {
  const msgs = D.carregar().msgs;
  const rel = analisarTodas().filter((x) => x.risco > 0).sort((a, b) => b.risco - a.risco);
  console.log(`${msgs.length} mensagens, ${rel.length} com algum sinal`);
  rel.forEach((x) => console.log(`\n[risco ${x.risco}] ${x.id} ${x.remetente} | ${x.assunto} | forn: ${x.fornecedor || "?"} (${x.via || "-"})\n   - ` + x.sinais.map((s) => s.s).join("\n   - ")));
}
