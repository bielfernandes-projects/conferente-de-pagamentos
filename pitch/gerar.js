// Gera pitch/pitch.html: o deck dos 5 minutos (estrutura do workshop de pitch) com o kit de marca Gogroup, tudo embutido.
// Os números vêm dos dados (motor, placar, duplicidades ja pagas, testes); só o que não está em arquivo fica escrito aqui, com a fonte.
//   node gerar.js        (antes: node conferente/pagina.js, node conferente/duplicidades.js)
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const RAIZ = path.join(__dirname, ".."), CONF = path.join(RAIZ, "conferente"), SAIDA = path.join(CONF, "saida");
const lerJson = (f) => JSON.parse(fs.readFileSync(path.join(SAIDA, f), "utf8"));
const b64 = (f) => fs.readFileSync(f).toString("base64");

// ---------- números (todos rastreáveis) ----------
const lote = lerJson("RM20261103-MER.json").decisoes;                     // lote da demo: Meridiano, 03/11, 10h
const dup = lerJson("duplicidades_ja_pagas.json");                        // dinheiro já pago em dobro (conferido no extrato do Meridiano)
const placar = lerJson("placar.json");                                     // período coberto pelos dados
const testes = (() => { const r = spawnSync(process.execPath, ["--test", "tests/"], { cwd: CONF, encoding: "utf8" }); const m = /ℹ tests (\d+)/.exec(r.stdout || ""); const p = /ℹ pass (\d+)/.exec(r.stdout || ""); return { n: m ? +m[1] : null, ok: m && p && m[1] === p[1] }; })();
if (!testes.n || !testes.ok) { console.error("os testes do conferente não estão todos passando; não gero o deck com número de testes errado"); process.exit(1); }
const mil = (v) => "R$ " + Math.round(v / 1000).toLocaleString("pt-BR") + " mil";
const dd = (iso) => iso.split("-").reverse().slice(0, 2).join("/");   // 2026-11-13 -> 13/11
const mi = (v) => "R$ " + (v / 1e6).toFixed(2).replace(".", ",") + " mi";
const reais = (v) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const N = { titulosLote: lote.length, valorLote: lote.reduce((s, d) => s + d.valor, 0), dobro: dup.total, dobroN: dup.pagamentosAMais, confirmado: dup.confirmadoNoExtrato.soma, confirmadoN: dup.confirmadoNoExtrato.n, meridianoN: dup.meridiano.n,
  semanaTitulos: placar.titulos, retido: placar.em_risco, cancelado: placar.cancelado, testes: testes.n };
// Medido à mão em 07/11 (`time node agente.js <caso>`): 37 s (cancelar duplicata) e 58 s (caso que escala). A premissa de 10 min é ESTIMATIVA a validar.
const TEMPO = { agente: "37 s e 58 s", premissaManual: "10 min" };
const ELEVATOR = `Para o time de contas a pagar, que assina o lote das 10h sem conferir título por título, e já pagou ${mil(N.dobro)} em dobro na base, construí o Conferente de Pagamentos, um agente que confere cada pagamento antes de o dinheiro sair, resolve sozinho o que é simples e chama uma pessoa, com o dossiê pronto, quando passa de R$ 5 mil ou precisa de contato com o fornecedor. Com ele, o tesoureiro só olha as exceções.`;

// ---------- marca embutida ----------
const MARCA = path.join(CONF, "marca");
const fontes = [400, 600, 700, 800].map((w) => `@font-face{font-family:'Poppins';font-weight:${w};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${b64(path.join(MARCA, "poppins-" + w + ".woff2"))}) format('woff2')}`).join("");
const logo = "data:image/png;base64," + b64(path.join(MARCA, "logo.png"));
const img = (n) => "data:image/png;base64," + b64(path.join(__dirname, "assets", n + ".png"));
const baseCss = fs.readFileSync(path.join(__dirname, "viewport-base.css"), "utf8");   // palco fixo 1920x1080 (cópia local da base da skill frontend-slides, para o gerador não depender de .claude/)

// ---------- slides ----------
// alvo = minuto da estrutura do workshop. notas = o que falar.
const slides = [
{ alvo: "0:00", rotulo: "Abertura", html: `
  <div class="pill">GoHacks Talent 2026 · Desafio Pagamentos</div>
  <div class="bloco am" style="left:1180px;top:150px;width:660px;height:200px"><p class="peq esc">Desafio 2</p><p class="med esc b">Pagamentos</p></div>
  <div class="bloco az" style="left:1180px;top:374px;width:660px;height:556px"><p class="med br b" style="position:absolute;left:52px;bottom:96px">Gabriel</p><p class="peq br" style="position:absolute;left:52px;bottom:48px">Pitch de 5 minutos</p></div>
  <h1 class="r" style="left:80px;top:190px;width:1040px;font-size:132px">Conferente de Pagamentos</h1>
  <p class="r corpo" style="left:80px;top:610px;width:1040px;font-size:52px;line-height:1.3">Um agente confere cada pagamento. A pessoa só olha as exceções.</p>`,
  notas: `0:00 a 0:15. Diga o elevator pitch em UMA respiração, sem ler o slide: ${ELEVATOR}` },

{ alvo: "0:15", rotulo: "A dor", html: `
  <div class="pill">0:15 · A dor</div><div class="pill dir">GoHacks Talent 2026</div>
  <h2 class="t r">O lote das 10h sai sem ninguém conferir.</h2>
  <div class="area" style="top:400px;bottom:150px;grid-template-columns:1fr 1.3fr 1fr">
    <div class="bloco az r"><b class="gr">${N.titulosLote}</b><p class="med br b">títulos num lote só</p><p class="peq br">${mi(N.valorLote)} · Meridiano · 03/11, 10h</p></div>
    <div class="bloco vm r"><b class="gr" style="font-size:112px;white-space:nowrap">${mil(N.dobro)}</b><p class="med br b">já pagos em dobro na base</p><p class="peq br">${N.dobroN} casos</p></div>
    <div class="bloco am r"><b class="gr esc">1</b><p class="med esc b">assinatura</p><p class="peq esc">sem conferir título por título</p></div></div>
  <p class="nota">Dados sintéticos do GoHacks Talent 2026. Pagamento a mais = títulos pagos além do primeiro com mesma NF e parcela (valor até 1% de diferença).</p>`,
  notas: `0:15 a 0:50. Dê rosto à dor: o tesoureiro assina o lote das 10h. Só o lote de 3 de novembro tem ${N.titulosLote} títulos e ${mi(N.valorLote)}. O erro nasce no cadastro manual e o dinheiro não volta: na base há ${N.dobroN} pagamentos feitos em dobro, ${mil(N.dobro)}, e em ${N.confirmadoN} deles o débito aparece no extrato do banco (${mil(N.confirmado)}). Os outros ${N.dobroN - N.confirmadoN} são de outro banco ou sem débito achado: não afirme que saiu.` },

{ alvo: "0:50", rotulo: "Visão 360", html: `
  <div class="pill">0:50 · Visão 360</div><div class="pill dir">GoHacks Talent 2026</div>
  <h2 class="t r" style="font-size:76px">A área inteira. A frente que provamos.</h2>
  <div class="area" style="top:330px;bottom:150px;grid-template-columns:1.25fr .85fr;gap:36px">
    <div class="lista r">
      <div><i>✓</i><b>Volume que ninguém revisa</b></div>
      <div><i>✓</i><b>Cadastro manual repetido</b></div>
      <div><i>✓</i><b>Erro que nasce na digitação</b></div>
      <div><i>✓</i><b>Informação espalhada</b></div>
      <div><i>✓</i><b>Pegar antes de o dinheiro sair</b></div>
      <div><i>✓</i><b>O que segue sozinho × aprovação</b></div></div>
    <div class="col">
      <div class="bloco az r" style="flex:1;padding:32px 44px"><p class="peq br b" style="letter-spacing:.08em;text-transform:uppercase;font-size:23px">A frente que provamos</p><ul class="br compacta"><li>Duplicidade</li><li>Valor com zero a menos</li><li>Golpe de troca de conta</li><li>Nota de outro emitente</li></ul></div>
      <div class="bloco br2 r" style="padding:22px 40px"><p class="peq b" style="color:var(--az);letter-spacing:.08em;text-transform:uppercase;font-size:21px">Ficou de fora, de propósito</p><p class="peq" style="margin-top:6px;font-size:26px">extrato · fora do lote · alçada</p></div></div></div>`,
  notas: `0:50 a 1:20. O desafio tem seis dores. Toquei nas seis, e provei quatro tipos de erro: duplicidade, valor com zero a menos, golpe de troca de conta e nota de outro emitente. Fale do que ficou de fora com naturalidade: extrato no agente, pagamento fora do lote e fracionamento de alçada. Honestidade vale mais que parecer completo.` },

{ alvo: "1:20", rotulo: "O agente", html: `
  <div class="pill">1:20 · O agente</div><div class="pill dir">GoHacks Talent 2026</div>
  <h2 class="t r">Três papéis. Cada um com um dono.</h2>
  <div class="area" style="top:360px;bottom:300px;grid-template-columns:repeat(3,1fr)">
    <div class="bloco az r"><p class="tag am2">Código decide a regra</p><p class="med br b" style="margin-top:22px">5 checagens por título</p><p class="peq br" style="margin-top:12px">duplicidade, 3 vias, boleto, troca de conta e limite</p></div>
    <div class="bloco ci r"><p class="tag az2">A IA investiga e escreve</p><p class="med esc b" style="margin-top:22px">11 ferramentas</p><p class="peq esc" style="margin-top:12px">consulta, corrige, cancela e monta o dossiê</p></div>
    <div class="bloco am r"><p class="tag az2">A pessoa contata e decide</p><p class="med esc b" style="margin-top:22px">O agente não aprova nem contata</p><p class="peq esc" style="margin-top:12px">investiga tudo; age até R$ 5 mil, o resto vai para uma pessoa</p></div></div>
  <div class="bloco az r" style="left:80px;right:80px;bottom:150px;height:130px;padding:0 52px;display:flex;align-items:center"><p class="med br b" style="font-size:42px">As travas que protegem dinheiro são calculadas em código, não em prompt.</p></div>`,
  notas: `1:20 a 2:10. O que ele faz sozinho: o código aplica a regra, a IA investiga e escreve, a pessoa contata o fornecedor e decide. Fale do que a IA faz no fluxo, não de como foi treinada. Frase-chave: as travas que protegem dinheiro são calculadas em código, não em prompt. Uma justificativa bem escrita pelo modelo não vale nada para o sistema.` },

{ alvo: "2:10", rotulo: "Demo", html: `
  <div class="pill">2:10 · Demo ao vivo</div><div class="pill dir">GoHacks Talent 2026</div>
  <h2 class="t r" style="font-size:120px">Agora, ao vivo.</h2>
  <p class="r corpo" style="left:80px;top:340px;width:1760px;font-size:44px">Dia 13/11 · o lote das 10h, como o tesoureiro vê.</p>
  <div class="area" style="top:470px;height:420px;grid-template-columns:repeat(4,1fr);gap:28px">
    <div class="bloco az r"><b class="gr">1</b><p class="med br b">Abrir o dia</p><p class="peq br">o que o agente já fez</p></div>
    <div class="bloco ci r"><b class="gr esc">2</b><p class="med esc b">Ler o dossiê</p><p class="peq esc">provas e telefone do cadastro</p></div>
    <div class="bloco az r"><b class="gr">3</b><p class="med br b">Marcar como lido</p><p class="peq br">libera o envio</p></div>
    <div class="bloco am r"><b class="gr esc">4</b><p class="med esc b">Enviar e-mails</p><p class="peq esc">simulado</p></div></div>`,
  notas: `2:10 a 3:30 (80 s). ANTES: abra a página com #reiniciar no fim do endereço (conferente/saida/index.html#reiniciar) para zerar o dia 13/11 e deixe a aba pronta. Mostre este slide por 5 segundos e troque para a página. ROTEIRO (um passo por beat, sem pressa): 1) a página abre no dia 13/11 ("Hoje"): mostre o que o agente já fez sozinho e o que sobrou para a pessoa. 2) Passo "Entrar em contato com …": abra o dossiê (Embalarte): telefone DO CADASTRO, perguntas para o contato, "se confirmar / se negar". Diga: "o agente não liga e não aprova: ele monta tudo para a pessoa". 3) Marque "Marcado como lido": a barra avança e o botão de envio é liberado. 4) Clique em "Enviar e-mails", mostre a revisão (dossiê completo) e confirme: "é simulado; em produção iria por SMTP ou Outlook". Feche com o tempo: "antes ~${TEMPO.premissaManual} (Premissa de ${TEMPO.premissaManual} a validar com o time de contas a pagar), agora menos de 1 minuto (medido no agente: ${TEMPO.agente})". Caso extra, se sobrar tempo: dia 03/11 (index.html#dia-2026-11-03), TP429865 (Duraplast), duplicata cancelada sozinha.` },

{ alvo: "3:30", rotulo: "Como fez", html: `
  <div class="pill">3:30 · Como fez</div><div class="pill dir">GoHacks Talent 2026</div>
  <h2 class="t r" style="font-size:78px">Onde a IA errou. E como eu corrigi.</h2>
  <div class="area" style="top:330px;bottom:280px;grid-template-columns:repeat(3,1fr);gap:28px">
    <div class="duo r"><div class="bloco vm"><p class="tag br2">Errou</p><p class="peq br b" style="margin-top:14px;font-size:31px">Cancelou um título legítimo</p></div><div class="bloco ci"><p class="tag az2">Correção</p><p class="peq esc" style="margin-top:14px">Só cancela com gêmeo mais antigo.</p></div></div>
    <div class="duo r"><div class="bloco vm"><p class="tag br2">Errou</p><p class="peq br b" style="margin-top:14px;font-size:31px">Criou uma duplicidade ao “corrigir” um valor</p></div><div class="bloco ci"><p class="tag az2">Correção</p><p class="peq esc" style="margin-top:14px">Correção que duplica é negada.</p></div></div>
    <div class="duo r"><div class="bloco vm"><p class="tag br2">Errou</p><p class="peq br b" style="margin-top:14px;font-size:31px">Deixou ${mil(121061.51)} pendente dentro do lote</p></div><div class="bloco ci"><p class="tag az2">Correção</p><p class="peq esc" style="margin-top:14px">Pedir aprovação tira do lote.</p></div></div></div>
  <div class="bloco am r" style="left:80px;right:80px;bottom:150px;height:100px;padding:0 44px;display:flex;align-items:center"><p class="peq esc b" style="font-size:30px;white-space:nowrap">Como sei que acertou: ${N.testes} testes, mutação e verificador independente.</p></div>`,
  notas: `3:30 a 4:00. Três erros reais, todos registrados no VERIFICACAO.md. O mesmo agente deu respostas diferentes em rodadas diferentes: por isso a justificativa dele não conta e a trava é do código. "Como sei que acertou?": ${N.testes} testes automáticos, mutação (quebro a regra de propósito e o teste tem que falhar) e um verificador que não usa o código do ERP. Ele também errou uma vez e eu corrigi: diga isso, mostra honestidade.` },

{ alvo: "4:00", rotulo: "Impacto", html: `
  <div class="pill">4:00 · Impacto</div><div class="pill dir">GoHacks Talent 2026</div>
  <h2 class="t r">O número que fica.</h2>
  <div class="area" style="top:310px;bottom:270px;grid-template-columns:1.25fr 1fr;grid-template-rows:1fr 1fr;gap:24px">
    <div class="bloco az r" style="grid-row:1/3"><b class="gr" style="font-size:136px;white-space:nowrap">${mil(N.dobro)}</b><p class="med br b">já saíram em dobro nesta base</p><p class="peq br" style="margin-top:8px">${N.dobroN} casos · ${mil(N.confirmado)} confirmados no extrato</p></div>
    <div class="bloco ci r" style="padding:30px 40px"><b class="gr3 esc" style="font-size:56px">${mil(N.retido)}</b><p class="peq esc b" style="font-size:26px">retidos antes de sair, em ${placar.dias} dias</p><p class="peq esc" style="font-size:22px">+ ${mil(N.cancelado)} de duplicidade cancelada</p></div>
    <div class="bloco am r" style="padding:30px 40px"><b class="gr3 esc" style="font-size:56px;white-space:nowrap">${TEMPO.premissaManual} → &lt; 1 min</b><p class="peq esc b" style="font-size:26px">por título suspeito</p><p class="peq esc" style="font-size:22px">premissa a validar</p></div></div>
  <div class="bloco br2 r" style="left:80px;right:80px;bottom:150px;height:104px;padding:0 44px;display:flex;align-items:center"><p class="peq" style="font-size:30px"><b style="color:var(--az)">Replica em AZ, Gobeaute e Jump:</b> só os parâmetros mudam.</p></div>`,
  notas: `4:00 a 5:00. O número que fica: ${mil(N.dobro)} pagos em dobro nesta base. Diga a premissa em voz alta: "pagamento a mais é todo título pago depois do primeiro com a mesma NF e parcela, valor até 1% de diferença; ${mil(N.confirmado)} têm débito confirmado no extrato do Meridiano". Cuidado: eu NÃO afirmo que o agente "teria evitado" os ${mil(N.dobro)}: ele não rodou sobre o histórico, só sobre os dias ${dd(placar.de)} a ${dd(placar.ate)}. Nos ${placar.dias} dias: ${mil(N.retido)} retidos antes de sair (ainda não sabemos se são golpe) e ${mil(N.cancelado)} de duplicidade cancelada. O tempo de ${TEMPO.premissaManual} é ESTIMATIVA: diga que vai validar com o time. Replicabilidade: a política vive em um arquivo de parâmetros; AZ, Gobeaute e Jump trocam os números, o resto é igual.` },

{ alvo: "5:00", rotulo: "Fechamento", html: `
  <div class="pill">Obrigado</div>
  <div class="bloco am" style="left:1180px;top:150px;width:660px;height:200px"></div>
  <div class="bloco az" style="left:1180px;top:374px;width:660px;height:556px"><p class="br b" style="position:absolute;left:52px;right:52px;top:48px;font-size:44px;line-height:1.3">Gabriel<br><span style="font-weight:400">Conferente de Pagamentos</span></p></div>
  <h1 class="r" style="left:80px;top:230px;width:1040px;font-size:112px">O lote das 10h deixa de sair às cegas.</h1>
  <p class="r corpo" style="left:80px;top:690px;width:1040px;font-size:40px;line-height:1.35">Um agente confere cada pagamento. A pessoa só olha as exceções.</p>`,
  notas: `Fim dos 5 minutos. Deixe este slide aberto para as perguntas. Perguntas duras que a banca pode fazer: "por que isso e não uma regra simples?", "como sabe que a IA acertou?", "e se escalar?", "qual o ganho em reais?". Respostas nos números do slide 7 e nas travas do slide 4.` },

];

const total = slides.filter((s) => !s.ap).length;
const secoes = slides.map((s, i) => `<section class="slide${i === 0 ? " active visible" : ""}" data-alvo="${s.alvo || ""}" data-rotulo="${s.rotulo}" ${s.ap ? 'data-ap="1"' : ""} aria-label="${s.rotulo}">${s.html}
  <img class="logo-rodape" src="${logo}" alt="Gogroup"><span class="cont">${s.ap ? "plano B" : String(i + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0")}</span>
  <aside class="notes">${s.notas}</aside></section>`).join("\n");

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Conferente de Pagamentos · Pitch · Gogroup</title>
<style>
/* === FONTES: Poppins (tipografia do brandbook), embutida para funcionar offline === */
${fontes}

/* === TEMA (kit de marca Gogroup) ===
   Azul #2659a5 protagonista; amarelo #d7d900, vermelho #e5273c e ciano #3dbfef como blocos de cor.
   Regras do brandbook: não usar branco sobre amarelo/ciano; não pôr laranja, vermelho e rosa lado a lado; não alterar o logo. */
:root{--az:#2659a5;--am:#d7d900;--vm:#e5273c;--ci:#3dbfef;--esc:#0f2747;--tx:#333;--mut:#6b7280;
  --stage-bg:#0f2747;--slide-bg:#f2f2f2;--font:'Poppins',system-ui,sans-serif;--ease:cubic-bezier(.16,1,.3,1)}
*{margin:0;padding:0;box-sizing:border-box}

/* === PALCO FIXO 16:9 (viewport-base.css da skill, na íntegra) === */
${baseCss}

/* === SLIDES: tipografia e blocos, em medidas do palco 1920x1080 === */
.slide{font-family:var(--font);color:var(--tx)}
.pill{position:absolute;top:64px;left:80px;background:var(--az);color:#fff;font-weight:700;font-size:22px;letter-spacing:.09em;text-transform:uppercase;padding:12px 30px;border-radius:999px}
.pill.dir{left:auto;right:80px}
h1,h2{font-weight:800;color:var(--az);letter-spacing:-.015em}
h1{position:absolute;line-height:1.02}
h2.t{position:absolute;left:80px;top:160px;font-size:84px;line-height:1.05;width:1760px}
.corpo{position:absolute;color:var(--tx)}
.nota{position:absolute;left:80px;right:80px;bottom:112px;font-size:21px;color:var(--mut)}
.area{position:absolute;left:80px;right:80px;display:grid;gap:24px}
.col{display:flex;flex-direction:column;gap:24px}
.bloco{border-radius:56px;padding:48px 52px;position:relative}
.bloco.az,.az{background:var(--az)}.bloco.am,.am{background:var(--am)}.bloco.vm,.vm{background:var(--vm)}.bloco.ci,.ci{background:var(--ci)}.bloco.br2{background:#fff;border:2px solid #e3e5ea;color:var(--tx)}
.bloco[style*="left:"]{position:absolute}
.br{color:#fff}.esc{color:var(--esc)}
.gr{display:block;font-weight:800;font-size:150px;line-height:1;margin-bottom:10px;color:#fff}
.gr.esc{color:var(--esc)}.gr2{font-weight:800;font-size:76px;line-height:1;white-space:nowrap}.gr3{display:block;font-weight:800;font-size:64px;line-height:1.05;margin-bottom:6px}
.med{font-size:38px;line-height:1.2}.peq{font-size:27px;line-height:1.35}.b{font-weight:700}
.tag{display:inline-block;font-weight:700;font-size:21px;letter-spacing:.08em;text-transform:uppercase;padding:9px 22px;border-radius:999px}
.am2{background:var(--am);color:var(--esc)}.az2{background:var(--az);color:#fff}.br2{background:#fff;color:var(--vm)}
.lista{display:flex;flex-direction:column;gap:10px}
.lista div{display:grid;grid-template-columns:56px 1fr;grid-template-rows:auto auto;column-gap:20px;background:#fff;border-radius:30px;padding:9px 26px;align-items:center}
.lista i{grid-row:1/3;width:48px;height:48px;border-radius:50%;background:var(--ci);color:var(--esc);font-style:normal;font-weight:800;font-size:28px;display:flex;align-items:center;justify-content:center}
.lista b{font-size:29px;color:var(--esc);line-height:1.2}.lista span{font-size:23px;color:var(--mut);line-height:1.25}
ul.br{list-style:none;margin-top:18px}ul.br li{font-size:36px;font-weight:700;padding:11px 0;border-top:2px solid rgba(255,255,255,.28)}ul.br li:first-child{border-top:0}
ul.br.compacta{margin-top:10px}ul.br.compacta li{font-size:30px;padding:8px 0}
.duo{display:flex;flex-direction:column;gap:14px}.duo .bloco{padding:30px 34px;border-radius:44px}.duo .bloco:first-child{flex:1.35}.duo .bloco:last-child{flex:1}
.foto{position:absolute;border-radius:28px;box-shadow:0 18px 48px rgba(15,39,71,.22);border:2px solid #e3e5ea;background:#fff}
.logo-rodape{position:absolute;left:80px;bottom:44px;height:46px}
.cont{position:absolute;right:80px;bottom:52px;font-size:24px;font-weight:600;color:var(--mut)}
.notes{display:none}

/* === ANIMAÇÃO: entrada sutil e rápida (feeling profissional) === */
.reveal,.r{opacity:0;transform:translateY(26px);transition:opacity .55s var(--ease),transform .55s var(--ease)}
.slide.visible .r{opacity:1;transform:none}
.slide.visible .r:nth-child(2){transition-delay:.08s}.slide.visible .r:nth-child(3){transition-delay:.16s}.slide.visible .r:nth-child(4){transition-delay:.24s}

/* === CONTROLES FORA DO PALCO (não aparecem na tela do slide) === */
#painel{position:fixed;left:16px;right:16px;bottom:16px;z-index:2000;background:rgba(15,39,71,.96);color:#fff;font:400 18px/1.5 var(--font);padding:16px 22px;border-radius:20px;display:none;max-height:38vh;overflow:auto}
#painel.on{display:block}#painel b{color:var(--am)}
#relogio{position:fixed;top:12px;right:16px;z-index:2000;background:rgba(15,39,71,.92);color:#fff;font:700 20px var(--font);padding:8px 16px;border-radius:999px;display:none}#relogio.on{display:block}#relogio.atraso{background:var(--vm)}
#ajuda{position:fixed;left:16px;top:12px;z-index:2000;color:rgba(255,255,255,.55);font:400 14px var(--font);animation:some 0.01s 5s forwards}
@keyframes some{to{opacity:0;visibility:hidden}}
body.editando [contenteditable]{outline:2px dashed var(--am);outline-offset:4px}
@media print{#painel,#relogio,#ajuda{display:none!important}}
</style>
</head>
<body>
<div id="ajuda">← → navegar · N notas · T cronômetro · E editar · F tela cheia</div>
<div id="relogio"></div>
<div id="painel"></div>
<div class="deck-viewport">
  <main class="deck-stage" id="deckStage">
${secoes}
  </main>
</div>
<script>
/* === CONTROLADOR: escala do palco, navegação, notas, cronômetro e edição === */
class Deck {
  constructor() {
    this.slides = [...document.querySelectorAll('.slide')];
    this.stage = document.getElementById('deckStage');
    this.i = 0; this.t0 = null; this.editando = false;
    this.escala(); addEventListener('resize', () => this.escala());
    this.teclado(); this.toque();
    const n = parseInt(location.hash.slice(1), 10); this.ir(Number.isFinite(n) ? n - 1 : 0);
    setInterval(() => this.relogio(), 500);
  }
  escala() { const f = Math.min(innerWidth / 1920, innerHeight / 1080); this.stage.style.transform = 'translate(' + ((innerWidth - 1920 * f) / 2) + 'px,' + ((innerHeight - 1080 * f) / 2) + 'px) scale(' + f + ')'; }
  ir(n) {
    this.i = Math.max(0, Math.min(n, this.slides.length - 1));
    this.slides.forEach((s, k) => { s.classList.toggle('active', k === this.i); s.classList.toggle('visible', k === this.i); });
    history.replaceState(null, '', '#' + (this.i + 1)); this.notas();
  }
  notas() { const p = document.getElementById('painel'), s = this.slides[this.i]; p.innerHTML = '<b>' + (this.i + 1) + '. ' + s.dataset.rotulo + (s.dataset.alvo ? ' · alvo ' + s.dataset.alvo : '') + '</b><br>' + s.querySelector('.notes').innerHTML; }
  relogio() {
    const r = document.getElementById('relogio'); if (!this.t0) { r.textContent = 'cronômetro: aperte T'; return; }
    const seg = Math.floor((Date.now() - this.t0) / 1000), m = Math.floor(seg / 60), s = seg % 60, alvo = this.slides[this.i].dataset.alvo;
    const [am, as] = (alvo || '0:00').split(':').map(Number); r.classList.toggle('atraso', !!alvo && seg > am * 60 + as + 25);
    r.textContent = m + ':' + String(s).padStart(2, '0') + (alvo ? '  ·  este slide: ' + alvo : '');
  }
  teclado() {
    addEventListener('keydown', (e) => {
      if (this.editando && !(e.ctrlKey && e.key.toLowerCase() === 's') && e.key.toLowerCase() !== 'e' || e.target.isContentEditable) { if (e.key !== 'Escape') return; }
      const k = e.key.toLowerCase();
      if (['arrowright', 'arrowdown', 'pagedown', ' ', 'enter'].includes(k)) { e.preventDefault(); this.ir(this.i + 1); }
      else if (['arrowleft', 'arrowup', 'pageup', 'backspace'].includes(k)) { e.preventDefault(); this.ir(this.i - 1); }
      else if (k === 'home') this.ir(0); else if (k === 'end') this.ir(this.slides.length - 1);
      else if (k === 'n') document.getElementById('painel').classList.toggle('on');
      else if (k === 't') { const r = document.getElementById('relogio'); r.classList.toggle('on'); if (r.classList.contains('on')) this.t0 = this.t0 || Date.now(); else this.t0 = null; }
      else if (k === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
      else if (k === 'e') this.editar();
      else if (e.ctrlKey && k === 's') { e.preventDefault(); this.salvar(); }
    });
  }
  toque() { let x0 = null; addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true }); addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) this.ir(this.i + (dx < 0 ? 1 : -1)); x0 = null; }); }
  editar() { this.editando = !this.editando; document.body.classList.toggle('editando', this.editando); this.stage.querySelectorAll('h1,h2,p,li,b,span').forEach((el) => { if (this.editando) el.setAttribute('contenteditable', 'true'); else el.removeAttribute('contenteditable'); }); }
  salvar() { const c = document.documentElement.cloneNode(true); c.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable')); c.querySelector('body').classList.remove('editando');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['<!DOCTYPE html>\\n' + c.outerHTML], { type: 'text/html' })); a.download = 'pitch-editado.html'; a.click(); }
}
new Deck();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, "pitch.html"), html);
console.log(`ok → pitch/pitch.html · ${total} slides · ${Math.round(html.length / 1024)} KB · testes ${N.testes}/${N.testes}`);
console.log("números:", JSON.stringify({ lote: N.titulosLote, valorLote: Math.round(N.valorLote), dobro: Math.round(N.dobro), confirmado: Math.round(N.confirmado), retido: Math.round(N.retido), cancelado: Math.round(N.cancelado) }));
