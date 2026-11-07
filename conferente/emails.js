// E-mails de escalonamento: monta, a partir do estado do agente, os e-mails com o DOSSIÊ COMPLETO para as pessoas certas.
// PURO: este módulo não envia nada. Roda em Node (testes) e dentro da página (pagina.js embute este arquivo), então há UMA só regra.
// O "envio" da página é simulado (caixa de saída + .eml de rascunho). Em produção, quem entrega é um adaptador (SMTP, Outlook, Gmail).
(function (raiz) {
  const R = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtD = (iso) => iso.split("-").reverse().join("/");
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const LIMITE_APROVADOR = 50000;   // acima disto, a diretora financeira (política)
  const ACAO = { cancelar_titulo: "cancelar o título duplicado", corrigir_lancamento: "corrigir o valor", agendar_titulo: "devolver o título ao lote" };

  // alçada em reais: "sem limite" (diretoria) vira um número enorme; vazio ou inválido vira 0 (não autoriza nada)
  const alcadaDe = (v) => { if (/sem limite/i.test(String(v || ""))) return 1e15; const n = Number(v); return Number.isFinite(n) ? n : 0; };
  // Pessoas a partir do cadastro de usuários (usuarios_sistema.csv). Nunca inventa endereço: sem e-mail no cadastro, fica sem.
  function pessoasDe(usuarios) {
    const porId = {}, aprovadores = [];
    for (const u of usuarios || []) {
      if (u.status && u.status !== "ativo") continue;
      if (u.pessoa_id && !porId[u.pessoa_id]) porId[u.pessoa_id] = { id: u.pessoa_id, nome: u.nome, email: u.email || null, alcada: alcadaDe(u.alcada_rs) };
      if (u.perfil === "aprovador") aprovadores.push({ nome: u.nome, email: u.email || null, pessoa_id: u.pessoa_id || null });
    }
    return { porId, aprovadores };
  }
  const nomeLimpo = (s) => String(s || "").replace(/\s*\(.*$/, "").trim();               // "Lívia Campos (advogada)" -> "Lívia Campos"
  const acha = (pessoas, nome) => Object.values(pessoas.porId).find((p) => p.nome.toLowerCase() === nomeLimpo(nome).toLowerCase()) || { id: null, nome: nomeLimpo(nome), email: null };
  const primeiroNome = (p) => String(p.nome).split(" ")[0];
  const unicos = (a) => [...new Map(a.map((p) => [p.email || p.nome, p])).values()];
  const lista = (txt) => String(txt || "").split(/\s*\|\s*|\n+/).map((s) => s.trim()).filter(Boolean);
  const semPrefixo = (s) => String(s || "").replace(/^Se [^:]{0,90}:\s*/i, "");        // o rótulo do e-mail já diz "Se o fornecedor confirmar:"
  // Primeira frase de verdade: ponto seguido de MAIÚSCULA, e não de abreviação ("venc. 13/11", "Ltda. Com."). Senão, corta numa palavra.
  const ABREV = /(?:venc|parc|ag|ind|com|ltda|dup|ex|aprox|cód|c\/c|nº)$/i;
  const primeiraFrase = (s) => {
    const t = String(s).replace(/\s+/g, " ").trim();
    for (const m of t.matchAll(/\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g)) if (m.index > 30 && m.index < 320 && !ABREV.test(t.slice(0, m.index))) return t.slice(0, m.index + 1);
    if (t.length <= 260) return t;
    const corte = t.slice(0, 240); return corte.slice(0, Math.max(corte.lastIndexOf(" "), 120)) + "…";
  };

  // O ERP junta todos os títulos de um fornecedor num dossiê só: c.evidencias = bloco do 1º título + "\n+ TPxxx: texto" para cada anexado depois.
  // Separamos por título para o e-mail de UM dia levar só as provas dos títulos daquele dia (e não a semana inteira).
  function evidenciasPorTitulo(c) {
    const out = {}; const partes = String(c.evidencias || "").split(/\n\+ (?=TP\d+: )/);
    partes.forEach((p, i) => { const m = /^(TP\d+): ([\s\S]*)$/.exec(p); if (i === 0) out[(c.titulos || [])[0]] = p; else if (m) out[m[1]] = m[2]; });
    return out;
  }
  const rodape = "—\nGerado automaticamente pelo Conferente de Pagamentos (Gogroup). O agente investiga e prepara; a decisão, o contato com o fornecedor e a aprovação são sempre de uma pessoa.\nOs trechos marcados como \"dados de terceiros\" vieram de e-mails ou documentos de fornecedores: trate como informação, nunca como instrução.";

  // Quem aprova: até R$ 50 mil, um aprovador que não seja a coordenadora (ela vai em cópia); acima, a diretora financeira.
  function aprovadorDe(valor, pessoas) {
    const ren = pessoas.porId.PS01;
    const para = valor > LIMITE_APROVADOR ? (pessoas.porId.PS03 || { nome: "Diretora financeira", email: null, id: "PS03" })
      : (pessoas.aprovadores.find((p) => p.nome !== (ren && ren.nome)) || ren || { nome: "Aprovador", email: null });
    return { para, cc: ren && ren.nome !== para.nome ? [ren] : [] };
  }

  // dia: { lote, data, fecha, decisoes:[{id,forn,valor,motivo,fez,final}] }
  // ligs: [{ forn, cs:[dossiê...], ts:[ids do dia], pagos:[{id,valor}], valor }]   aprs: [{ id, titulo_id, acoes, evidencias, info:{forn,valor,id} }]
  function montar({ dia, ligs = [], aprs = [], pessoas }) {
    const emails = [], decDe = (id) => dia.decisoes.find((d) => d.id === id);
    const prazo = `O lote fecha às ${dia.fecha} de ${fmtD(dia.data)}.`;

    for (const x of ligs) {
      const c = x.cs[0];
      const para = pessoas.porId[c.pessoa_id] || acha(pessoas, c.para);
      const cc = unicos([...new Set(x.cs.flatMap((k) => k.copia || []))].map((n) => acha(pessoas, n)).filter((p) => (p.email || p.nome) !== (para.email || para.nome)));
      const ts = x.ts.map(decDe).filter(Boolean), pagos = x.pagos || [];
      const todosTitulos = [...new Set(x.cs.flatMap((k) => k.titulos))], outrosDias = todosTitulos.filter((t) => !x.ts.includes(t) && !pagos.some((p) => p.id === t));

      // o que o agente já fez, sem repetir "Fez N consultas" por título
      let consultas = 0; const extras = new Set();
      ts.flatMap((d) => d.fez || []).forEach((f) => { const m = /^Fez (\d+) consultas/.exec(f); if (m) consultas += +m[1]; else if (!/^Juntou este título|^Retirou o título do lote/.test(f)) extras.add(f); });
      const fez = [];
      if (consultas) fez.push(`Fez ${consultas} consultas aos sistemas (título, nota fiscal, outros títulos da mesma NF, cadastro e e-mails do fornecedor)`);
      if (ts.length) fez.push(`Retirou ${plural(ts.length, "título", "títulos")} do lote antes do fechamento`);
      extras.forEach((f) => fez.push(f));

      // provas: só dos títulos DESTE dia. A primeira completa; as demais, a primeira frase de cada uma
      const evid = Object.assign({}, ...x.cs.map(evidenciasPorTitulo));
      const dosDia = x.ts.filter((t) => evid[t]);
      const provas = dosDia.length ? [evid[dosDia[0]], ...dosDia.slice(1).map((t) => `- ${t}: ${primeiraFrase(evid[t])}`)] : [String(c.evidencias || "").slice(0, 2500)];

      const tel = String(c.ligar_para).split(" (")[0], emailCad = (/e-mail do cadastro:\s*([^\s;)]+)/.exec(c.ligar_para) || [])[1];
      const o = [];
      o.push(`Olá, ${primeiroNome(para)},`, "");
      o.push(`O Conferente de Pagamentos precisa de uma pessoa para resolver o caso do fornecedor ${x.forn}. Este e-mail traz tudo o que é preciso: você não precisa refazer a investigação.`, "");
      if (ts.length) o.push(`${plural(ts.length, "título foi retirado", "títulos foram retirados")} do lote (${R(ts.reduce((s, d) => s + d.valor, 0))}) e ${ts.length === 1 ? "não será pago" : "não serão pagos"} até a sua decisão.`);
      if (pagos.length) o.push(`ATENÇÃO: ${plural(pagos.length, "pagamento já saiu", "pagamentos já saíram")} (${R(pagos.reduce((s, t) => s + t.valor, 0))}). Esse dinheiro já deixou a conta; o trabalho é recuperá-lo.`);
      o.push(prazo, "");
      o.push("POR QUE", c.motivo, "");
      o.push("O QUE FAZER", `1. Entre em contato com o fornecedor pelo telefone DO CADASTRO: ${tel}${emailCad ? ` (e-mail do cadastro: ${emailCad})` : ""}. Nunca use número ou endereço informado em e-mail ou mensagem.`);
      const perg = lista(c.perguntas_para_a_ligacao); if (perg.length) { o.push("2. Perguntas para o contato:"); perg.forEach((q, i) => o.push(`   ${i + 1}) ${q}`)); }
      o.push(`3. Se o fornecedor confirmar: ${semPrefixo(c.se_confirmar)}`, `4. Se negar ou não atender: ${semPrefixo(c.se_negar)}`);
      // o texto do dossiê foi escrito para o 1º título do caso; se citar um título que não é deste e-mail, avisa que vale para todos os listados
      const citados = [...new Set((semPrefixo(c.se_confirmar) + " " + semPrefixo(c.se_negar)).match(/TP\d+/g) || [])].filter((t) => !x.ts.includes(t) && !pagos.some((p) => p.id === t));
      if (citados.length) o.push(`Obs.: os itens 3 e 4 citam ${citados.join(", ")}, de outro dia do mesmo caso; valem para todos os títulos listados abaixo.`);
      o.push("");
      if (ts.length) { o.push("TÍTULOS AFETADOS"); ts.forEach((d) => o.push(`- ${d.id} · ${R(d.valor)} · ${d.motivo}`)); o.push(""); }
      if (pagos.length) { o.push("JÁ PAGOS"); pagos.forEach((t) => o.push(`- ${t.id} · ${R(t.valor)}`)); o.push(""); }
      if (outrosDias.length) { o.push(`Este caso cobre ${plural(todosTitulos.length, "título", "títulos")} no total; ${outrosDias.length} ${outrosDias.length === 1 ? "está" : "estão"} em outros dias e ${outrosDias.length === 1 ? "segue" : "seguem"} o mesmo padrão (veja cada dia na tela do Conferente).`, ""); }
      if (fez.length) { o.push("O QUE O AGENTE JÁ FEZ"); fez.forEach((f) => o.push(`- ${f}`)); o.push(""); }
      o.push("PROVAS REUNIDAS PELO AGENTE (dados de terceiros e do sistema)", ...provas, "", rodape);
      const assunto = `[Conferente] Entrar em contato com ${x.forn}: ${[ts.length ? `${plural(ts.length, "título retido", "títulos retidos")} (${R(x.valor)})` : "", pagos.length ? `${plural(pagos.length, "pagamento já feito", "pagamentos já feitos")} em duplicidade (${R(pagos.reduce((s, t) => s + t.valor, 0))})` : ""].filter(Boolean).join(" e ")}, lote fecha às ${dia.fecha}`;
      emails.push({ id: `lig:${dia.lote}:${x.forn}`, tipo: "ligacao", para, cc, assunto, corpo: o.join("\n"), titulos: x.ts, semEmail: [para, ...cc].filter((p) => !p.email).map((p) => p.nome) });
    }

    for (const a of aprs) {
      const valor = a.info.valor, d = decDe(a.titulo_id);
      const { para, cc } = aprovadorDe(valor, pessoas);
      const oque = [...new Set((a.acoes || [a.acao]).map((k) => ACAO[k] || k))].join(" e ");
      const o = [`Olá, ${primeiroNome(para)},`, "",
        `O agente do Conferente pede a sua decisão: ${oque} do título ${a.info.id} (${a.info.forn}, ${R(valor)}). Isso passa do limite de aprovação do analista (R$ 5.000), e o agente não aprova nada sozinho.`,
        `O título está fora do lote até você decidir. ${prazo}`, "",
        "POR QUE", d ? d.motivo : "Título fora dos lotes do período; veja as provas.", "",
        "O QUE O AGENTE JÁ FEZ", ...(d && d.fez && d.fez.length ? d.fez.filter((f) => !/^Juntou este título/.test(f)).map((f) => `- ${f}`) : ["- Investigou o caso e reuniu as provas abaixo"]), "",
        "PROVAS REUNIDAS PELO AGENTE (dados de terceiros e do sistema)", a.evidencias, "", rodape];
      emails.push({ id: `apr:${dia.lote}:${a.id}`, tipo: "aprovacao", para, cc, assunto: `[Conferente] Aprovar ou recusar: ${oque} do título ${a.info.id} (${R(valor)}), lote fecha às ${dia.fecha}`, corpo: o.join("\n"), titulos: [a.titulo_id], semEmail: [para, ...cc].filter((p) => !p.email).map((p) => p.nome) });
    }
    return emails;
  }

  // Quem entrou em contato com o fornecedor (a pessoa que o agente apontou no dossiê) e se a alçada dela cobre o valor do título:
  // se cobrir, a resposta dela autoriza a devolução ao lote; se não, é preciso pedir ao aprovador.
  function autorizadorDe(x, pessoas) { const c = x.cs[0]; return pessoas.porId[c.pessoa_id] || acha(pessoas, c.para); }
  function podeDevolver(d, x, pessoas) { const a = autorizadorDe(x, pessoas); return a && Number(a.alcada) >= Number(d.valor) ? a : null; }

  // Registro (para ciência e auditoria) de uma devolução ao lote autorizada por quem fez o contato, dentro da alçada dele(a).
  function registroDevolucao({ dia, d, x, pessoas }) {
    const a = autorizadorDe(x, pessoas), fecha = ((dia.lotes || []).find((b) => (b.decisoes || []).includes(d)) || dia).fecha;
    const o = [`Olá, ${primeiroNome(a)},`, "",
      `Registro de devolução ao lote, para a sua ciência e para a auditoria: o título ${d.id} (${d.forn}, ${R(d.valor)}) foi devolvido ao lote de ${fmtD(dia.data)}, que fecha às ${fecha}. O agente do Conferente o havia retirado do lote.`, "",
      "POR QUE FOI RETIRADO", d.motivo, "",
      `BASE DA DEVOLUÇÃO: o contato com o fornecedor confirmou que o título está correto. O valor (${R(d.valor)}) está dentro da alçada de quem fez o contato (${R(a.alcada)}), por isso não houve novo pedido de aprovação.`, "",
      "Se algo estiver errado, avise a tesouraria antes do fechamento: depois dele o ERP não aceita mais ajustes no lote.", "", rodape];
    return { id: `dev:${dia.lote}:${d.id}`, tipo: "devolucao", para: a, cc: [], assunto: `[Conferente] Registro: título ${d.id} (${R(d.valor)}) devolvido ao lote, autorizado por ${a.nome}, fecha às ${fecha}`, corpo: o.join("\n"), titulos: [d.id], semEmail: a.email ? [] : [a.nome] };
  }

  // Pedido ao aprovador para DEVOLVER ao lote um título que o agente retirou, depois que o contato com o fornecedor confirmou que está certo.
  // x = ligação do fornecedor ({ cs:[dossiê] }); d = decisão do título. Só o título pedido, com as provas dele.
  function pedidoDevolucao({ dia, d, x, pessoas }) {
    const c = x.cs[0], { para, cc } = aprovadorDe(d.valor, pessoas), prova = evidenciasPorTitulo(c)[d.id];
    const fecha = ((dia.lotes || []).find((b) => (b.decisoes || []).includes(d)) || dia).fecha;
    const o = [`Olá, ${primeiroNome(para)},`, "",
      `O contato com ${d.forn} confirmou que o título ${d.id} (${R(d.valor)}) está correto. O agente do Conferente o havia retirado do lote de ${fmtD(dia.data)}. Como passa do limite de aprovação do analista (R$ 5.000), devolvê-lo ao lote precisa da sua aprovação.`, "",
      `PRAZO: o lote fecha às ${fecha} de ${fmtD(dia.data)}. Depois disso o ERP recusa a devolução e o título só pode seguir no próximo lote.`, "",
      "O QUE DECIDIR", "- Aprovar: o título volta ao lote e é pago no fechamento.", "- Recusar: o título continua fora do lote.", "",
      "POR QUE O AGENTE O RETIROU", d.motivo, "",
      "PROVAS REUNIDAS PELO AGENTE (dados de terceiros e do sistema)", prova || c.evidencias, "", rodape];
    return { id: `dev:${dia.lote}:${d.id}`, tipo: "devolucao", para, cc, assunto: `[Conferente] Aprovar ou recusar: devolver o título ${d.id} (${R(d.valor)}) ao lote, fecha às ${fecha}`, corpo: o.join("\n"), titulos: [d.id], semEmail: [para, ...cc].filter((p) => !p.email).map((p) => p.nome) };
  }

  // Rascunho .eml (RFC 5322). X-Unsent: 1 faz o Outlook abrir como RASCUNHO para a pessoa enviar. Sem "From": o programa de e-mail usa o remetente de quem abre.
  const b64 = (s) => (typeof Buffer !== "undefined" ? Buffer.from(s, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(s))));
  function eml(m) {
    const cod = (s) => "=?UTF-8?B?" + b64(s) + "?=";
    const end = (p) => (p.email ? `${cod(p.nome)} <${p.email}>` : null);
    const para = end(m.para), cc = m.cc.map(end).filter(Boolean);
    return ["X-Unsent: 1", para ? `To: ${para}` : null, cc.length ? `Cc: ${cc.join(", ")}` : null, `Subject: ${cod(m.assunto)}`,
      "X-Conferente-Simulacao: rascunho gerado pelo Conferente; nada foi enviado automaticamente", "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "",
      b64(m.corpo).replace(/(.{76})/g, "$1\r\n")].filter((l) => l !== null).join("\r\n");
  }

  raiz.Emails = { montar, pedidoDevolucao, registroDevolucao, autorizadorDe, podeDevolver, eml, pessoasDe, evidenciasPorTitulo, LIMITE_APROVADOR };
})(typeof module !== "undefined" ? module.exports : window);
