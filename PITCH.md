# PITCH — Conferente de Pagamentos

Notas para a banca. Cada argumento tem a prova correspondente no `VERIFICACAO.md`. Só entra aqui o que foi verificado.

## Argumento-chave: "As travas que protegem dinheiro são calculadas em código, não em prompt"

**Frase para falar (15 segundos):**
> "A IA investiga e decide, mas quem impede o erro caro é o código. Se um modelo pudesse cancelar uma dívida só porque escreveu uma boa justificativa, ele cancelaria dívida legítima. Então a justificativa dele não vale: o sistema calcula a prova por conta própria."

**A prova (aconteceu de verdade, não é hipotético):**
- Numa das rodadas, o agente **cancelou um título legítimo**: Embalarte TP431396, R$ 3.623,25, parcela 2/3 de uma NF com 3 parcelas corretas. Estava abaixo da alçada dele (R$ 5 mil), então executou sem ninguém ver. Em outra rodada, para o mesmo caso, ele só reteve o título. **O mesmo agente deu respostas diferentes.**
- Conferi com um script independente que usa só os CSVs: não existia título gêmeo mais antigo (as outras parcelas são parcelas diferentes).
- Correção: o cancelamento agora só executa se o **código** achar um título gêmeo (mesmo fornecedor, NF, parcela, valor com até 1% de diferença), mais antigo e vivo. A "evidência" escrita pelo modelo deixou de contar.
- **O meu próprio verificador também errou, e eu corrigi:** ele exigia valor idêntico e acusou um cancelamento correto (Maciez TP430389, duplicado com R$ 4,50 de diferença de digitação). Ao investigar achei a parcela 1/2 da mesma NF **paga em dobro em 09/10**. Isso vale falar: "verifiquei o verificador".

**Como responder à pergunta da banca "como você sabe que a IA acertou?":**
"Eu não sei, e por isso não confio. Um segundo script, que não usa nada do agente, confere cada ação contra os dados. Ele já pegou erros meus e do agente, e todos estão registrados."

## Outras travas que seguem o mesmo princípio (todas em `erp.js`)
- Acima de R$ 5 mil, corrigir, cancelar ou reagendar vira **pedido de aprovação**; o agente não tem ferramenta de aprovar.
- Título com pedido de aprovação pendente **sai do lote automaticamente**. Antes dessa trava, 7 títulos (R$ 121 mil) com aprovação pendente continuavam no lote e seriam pagos se ninguém agisse, incluindo um de R$ 48.380 que deveria ser R$ 4.838.
- Título escalado para contato sai do lote automaticamente.
- O telefone no dossiê é **sempre o do cadastro**, preenchido pelo sistema. Número que aparece em e-mail suspeito nunca entra.
- Mesmo fornecedor = **um contato só** (evita R$ 60 de acionamento por título).

## Outros argumentos com prova
- **O agente não entra em contato com o fornecedor.** Ele monta o dossiê (quem entra em contato, telefone do cadastro, perguntas, o que fazer se confirmar ou negar) e escala por e-mail. A pessoa que recebe é quem faz o contato.
- **Instrução plantada em e-mail é dado, nunca ordem.** Flexipack e Embalarte tentaram mandar o "assistente de IA" liberar sem conferir; o agente ignorou e registrou.
- **Erro de digitação que custa caro:** zero a menos em títulos já pagos (R$ 295 em vez de R$ 2.950; R$ 1.311,80 em vez de R$ 13.118,01); 24 dos 29 erros de fator 10 vieram do mesmo usuário. Isso é causa raiz de processo, candidato a trava no ERP.
- **A IA errou de verdade e foi corrigida:** ver os casos no `VERIFICACAO.md` (3 já são suficientes para o relatório individual).

## Cuidados (não prometer o que não foi provado)
- O ERP é **simulado**: as ações vão para um estado em arquivo, não para um sistema real. Dizer isso.
- Não há gabarito oficial. Os valores do placar são **estimativas a partir das ações do agente**.
- Em produção o Conferente rodaria agendado (ex.: 07h30 e 09h30), sem clique. **No protótipo é por comando** (`node rodar.js`).
- Não afirmar "o agente evitou R$ X" para títulos que aguardam contato com o fornecedor: ainda não se sabe se são golpe. Usar "fora do lote, em risco".

## Provas de engenharia (para "como você sabe que funciona?")
- **28 testes automáticos, sem IA e sem rede** (`node --test tests/`). Dois deles repetem tool calls REAIS de rodadas do agente: o incidente do título legítimo cancelado e a correção do zero a menos.
- **Mutação:** quebrei a regra de propósito e os testes falharam (tolerância: 5 falhas; alçada: 3; trava de cancelamento: o teste do incidente real falha). Teste que nunca falha não prova nada.
- **Refatoração sem regressão:** antes de reorganizar o código congelei as saídas; depois, 873 de 876 decisões idênticas (as 3 diferentes só ganharam o motivo certo) e a página idêntica byte a byte.
- **Verificador independente** (`verifica.js`): usa só os números da política, não o código do ERP. Mesmo assim ele errou uma vez (exigia valor idêntico) e foi corrigido.
- **O agente achou pagamentos em duplicidade já executados** (Maciez R$ 4.750,01, Cosmoderm ~R$ 9.006): dinheiro que já saiu e pode ser recuperado. Cuidado: valores vêm do agente, conferir antes de citar.

---
# Pitch de 5 minutos (formato do workshop) — deck em `pitch/pitch.html`

> Correção: eu vinha usando a estrutura de **3 minutos** da skill `hackathon-pitch` (dor 30s, solução 30s, demo 90s, impacto 30s). O workshop de pitch fala em **5 minutos**, com a estrutura abaixo. Ela substitui a antiga. (A skill continua com os 3 minutos escritos; não a alterei.)

## Esqueleto SOAR (uma frase por letra, como o workshop pede antes de montar os slides)
- **S, Situação:** Todo dia útil o financeiro assina um lote de ~100 pagamentos (R$ 2,24 mi só no lote das 10h de 03/11) sem conferir título por título, e o erro nasce no cadastro manual: na base, 53 pagamentos saíram em dobro (R$ 404 mil).
- **O, Obstáculos:** Os dados estão em vários sistemas que não conversam (ERP, Compras, NF-e, DDA, bancos, e-mail), o relógio fecha às 10h e às 14h, e a IA erra: cancelou título legítimo e "corrigiu" valor criando duplicidade.
- **A, Ações:** Motor de regras em código confere cada título; um agente de IA com 11 ferramentas investiga os suspeitos, age até R$ 5 mil e escala o resto para uma pessoa com dossiê pronto; as travas que protegem dinheiro são calculadas em código, e eu verifiquei com testes, mutação e um verificador independente.
- **R, Resultados:** Em 876 títulos de 9 dias (03/11 a 13/11): 51 casos tratados, R$ 17 mil de duplicidade cancelada, R$ 252 mil retidos antes de sair e 8 contatos escalados; e a base mostra R$ 404 mil já pagos em dobro (R$ 373 mil confirmados no extrato do banco).

## Elevator pitch (modelo do workshop; usar em 3 momentos: abertura, descrição da submissão, resposta no pré-júri)
"Para o time de contas a pagar, que assina o lote bancário sem conferir título por título, construí o Conferente de Pagamentos, um agente que confere cada pagamento antes de o dinheiro sair e só chama uma pessoa quando precisa. Com ele, a pessoa só olha as exceções."

## Roteiro (slide a slide; as notas de fala estão no deck: tecla N)
| Minuto | Slide | Conteúdo |
|---|---|---|
| 0:00 | Abertura | elevator pitch em 1 frase |
| 0:15 | A dor | 192 títulos / R$ 404 mil pagos em dobro / 1 assinatura |
| 0:50 | Visão 360 | as 6 dores do desafio, as 4 frentes provadas, o que ficou de fora |
| 1:20 | O agente | código decide a regra, IA investiga, pessoa contata e decide |
| 2:10 | Demo | caso 1 (resolve sozinho) e caso 2 (passa para uma pessoa), AO VIVO na página |
| 3:30 | Como fez | 3 erros da IA e as correções |
| 4:00 | Impacto | o número que fica, com a premissa, e a replicação |
| 5:00 | Fechamento | fica aberto para as perguntas |

Regra de ouro do workshop: se for cortar, corte texto, não a demonstração. **Teclas do deck:** setas navegam, N notas, T cronômetro (marca em vermelho se passar do alvo do slide), F tela cheia, E editar o texto (Ctrl+S salva uma cópia). Para a demo: `conferente/saida/index.html#dia-2026-11-03`.

## O que NÃO prometer no pitch (premissas e limites)
- Os R$ 404 mil são "pagos a mais" pela nossa regra (mesma NF e parcela, valor até 1% de diferença, primeiro título é o legítimo). **O agente não rodou sobre esse histórico**, só sobre os dias 03 a 13/11: não dizer que ele "teria evitado" os R$ 404 mil.
- **10 min por título suspeito é premissa minha, a validar com o time de contas a pagar.** O que foi medido: 37 s e 58 s por caso no agente.
- R$ 252 mil são "retidos para conferência", não "golpes evitados".

## Vídeo de plano B (roteiro de gravação, 30 a 35 s, sem som, acelerado 1,5x)
1. 0–5 s: abrir `index.html` (abre no dia mais recente, 13/11, marcado como Hoje) e clicar no dia 03/11.
2. 5–12 s: bloco azul (fecha às 10:00 e 14:00) e o amarelo "Seu próximo passo".
3. 12–22 s: o dossiê da Embalarte: telefone do cadastro, perguntas, "se confirmar / se negar".
4. 22–30 s: "Caso a caso", Duraplast: "Cancelou o título duplicado" e "Nada a fazer".
5. 30–35 s: marcar os passos como lidos (caixa "Marcado como lido"): a barra de progresso avança e, com todos lidos, o dia vira "✓ Resolvido".

## Visão de produto: botão "Enviar e-mails" (SIMULADO)
Depois que o tesoureiro vê tudo e confirma que precisa escalar para pessoas acima dele, ele clica em **"Enviar e-mails"**, que fica DENTRO de cada seção ("Entrar em contato" e "Decidir pedidos") e só é liberado depois de marcar a seção como **"Marcado como lido"**. A tela mostra cada e-mail (Para, Cc, assunto e o **dossiê completo**: por quê, telefone do cadastro, perguntas, se confirmar, se negar, títulos, o que o agente já fez, provas e prazo), exige a confirmação e registra na aba **Caixa de saída**, com o rascunho `.eml` de cada um.
- **É uma demonstração do que o produto teria: nenhum e-mail é enviado de verdade.** Em produção, o mesmo texto sairia por um adaptador (SMTP, Outlook ou Gmail) com as credenciais da empresa; essas integrações são evolução, não parte desta entrega.
- Quem recebe: a pessoa que o agente apontou no dossiê, com as outras em cópia; pedidos de aprovação vão para o aprovador do limite (acima de R$ 50 mil, para a diretora). Os endereços vêm só do cadastro de usuários da base.
- **Antes de ir ao vivo no dia 13/11:** abra a página com `#reiniciar` no fim do endereço (ou use o link discreto "Reiniciar as leituras e os e-mails enviados deste dia" no rodapé do dia) para zerar as leituras e os envios simulados.
- Na demo é **opcional (10 s)**: só se sobrar tempo dos 5 minutos. Diga "é simulado" antes que alguém pergunte.
