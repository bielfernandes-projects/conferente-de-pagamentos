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
**Principal (cerca de 25 s):** "Para o time de contas a pagar, que assina o lote das 10h sem conferir título por título, e já pagou R$ 404 mil em dobro na base, construí o Conferente de Pagamentos, um agente que confere cada pagamento antes de o dinheiro sair, resolve sozinho o que é simples e chama uma pessoa, com o dossiê pronto, quando passa de R$ 5 mil ou precisa de contato com o fornecedor. Com ele, o tesoureiro só olha as exceções."

**Se não couber numa respiração (15 s, abertura):** "O lote das 10h sai sem ninguém conferir título por título, e na base já saíram R$ 404 mil em dobro. Construí o Conferente de Pagamentos: um agente que confere cada pagamento antes de o dinheiro sair e só chama uma pessoa quando precisa."

**Uma frase (submissão e pré-júri):** "Agente que confere cada título do lote de pagamentos antes de fechar, resolve o simples até R$ 5 mil e entrega às pessoas um dossiê completo do que exige decisão ou contato, com as travas de segurança em código e sem ação sem aprovação humana."

- Não diga que o agente "teria evitado" os R$ 404 mil: ele rodou só de 03/11 a 13/11.

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

## Perguntas da banca: respostas de bolso

### 1. Qual arquitetura? Como a solução foi criada?
"Regra em código para achar, agente de IA para investigar, pessoa para decidir."
- **Regras em código** (`engine.js`, `titulos.js`, `politica.js`): varrem o lote e marcam o suspeito (duplicidade com tolerância de 1%, valor fora do padrão, dado diferente do cadastro). Determinístico, sem prompt.
- **Agente de IA** (`agente.js`): LLM com 11 ferramentas investiga cada caso suspeito, via AI Proxy do evento. O histórico de cada rodada fica gravado.
- **Trava no código** (`erp.js`): a IA só age até R$ 5 mil; o resto vira dossiê para uma pessoa.
- **Camada de dados** (`dados.js`): hoje lê CSV; trocar a fonte é trocar este adaptador.
- **Tela**: uma página HTML única. O ERP é simulado.

### 2. Como a IA chegou nesse resultado? Por que confiar?
- O agente recebe um título suspeito, consulta os dados com as ferramentas, decide e justifica. Medido: 37 s e 58 s por caso. Semana 03/11 a 11/11: 51 casos, nenhum sem desfecho.
- **"Não pedimos confiança no agente: as regras de segurança estão no código, não no prompt."** Só cancela com gêmeo mais antigo e vivo; não corrige para ficar igual a outro título; o telefone é sempre o do cadastro; acima de R$ 5 mil só monta dossiê; pessoas sempre aprovam e entram em contato.
- **Ponto forte:** a nossa verificação pegou erros do próprio agente (cancelou títulos legítimos, "corrigiu" valor para ficar duplicado, deixou R$ 121 mil com aprovação pendente dentro do lote). Cada erro virou trava no código e teste.
- Números verificados: R$ 404.029,42 pagos em duplicidade em 53 casos; R$ 373.306,09 confirmados no extrato da Meridiano.

### 3. Como seria numa implantação real na Gogroup?
Seja direto: hoje é protótipo, testado só com a base do desafio.
1. Trocar o adaptador de CSV por leitura do ERP (títulos, fornecedores, usuários) e do extrato bancário.
2. Cancelar e corrigir por API no ERP, com perfil de acesso restrito ao que o agente pode fazer (hoje é simulado).
3. E-mails por SMTP, Outlook ou Gmail com credenciais da empresa (hoje é simulado; o texto já está pronto).
4. Gatilho automático quando a Agenda Remessa do dia for gerada.
5. Governança: autenticação, log de auditoria, token em cofre, limite de R$ 5 mil validado com o financeiro.
6. Fase em sombra: algumas semanas só recomendando, comparando com a decisão do tesoureiro, antes de liberar qualquer ação automática.

### 4. Fluxo real do tesoureiro e no que ajuda
1. Chega a Agenda Remessa; o agente roda; a página abre no dia mais recente ("Hoje").
2. A página diz o que o agente já fez e o que sobrou para a pessoa.
3. Lê cada passo na ordem e marca "Marcado como lido".
4. Libera o envio, revisa os dossiês e envia os e-mails (simulado). Quem recebe entra em contato com o fornecedor; o tesoureiro não liga.
5. O dia fica resolvido quando todos os passos estiverem lidos.
- **Ajuda:** em vez de conferir o lote linha a linha, recebe só o que importa, já investigado, com provas e telefone do cadastro; o que seria pago em duplicidade é segurado antes do fechamento.
- **Cuidado:** "10 min manual por caso" é premissa NÃO validada. Diga "estimativa a validar com o financeiro; o que medimos foi o tempo do agente".

### Perguntas difíceis
- **"E se o agente errar?"** Os erros dele estão documentados e bloqueados no código; acima de R$ 5 mil ele não age; nada vai ao ERP sem pessoa.
- **"Funciona com dados reais?"** Só testamos com a base do desafio; não validado em produção.
- **"Por que LLM e não só regra?"** Regra acha; investigar cruzando extrato, histórico e cadastro caso a caso e montar o dossiê é o que o agente faz.

## Frase de impacto com número concreto (calculada por `conferente/duplicidades.js`, arquivo `saida/duplicidades_na_janela.json`)
**"Em 9 dias de lotes, 876 títulos e R$ 10 milhões, o agente tirou do lote R$ 105 mil em títulos duplicados: R$ 17 mil cancelou sozinho e R$ 88 mil ficaram retidos para um aprovador decidir antes de o dinheiro sair."**
- O recorte: duplicata = título da agenda (03/11 a 13/11) com um gêmeo vivo lançado ANTES dele (mesma NF e parcela, valor até 1% de diferença). São 13 títulos, R$ 105.263,62: 6 cancelados sozinhos (R$ 17.316,90, todos até R$ 5 mil) e 7 retidos para aprovação (R$ 87.946,72, todos acima de R$ 5 mil). Nenhum ficou no lote.
- **Os R$ 404 mil já pagos em dobro NÃO entram nessa conta:** os 53 casos foram pagos entre 03/08 e 30/10, antes dos lotes que o agente processou. Diga "já saíram em dobro nesta base", nunca "o agente teria evitado".
- **Retido não é evitado:** os R$ 88 mil só são evitados se o aprovador confirmar a duplicidade. Só os R$ 17 mil foram cancelados pelo agente.
- Não some com os R$ 252 mil retidos por sinal de risco (como troca de conta): são outro grupo, a confirmar por contato, e podem incluir parte dos R$ 88 mil (não cruzei). Dados sintéticos.

## Evolução: separar quem gera de quem assina o lote
- Na base, os 110 lotes já processados foram gerados e assinados pela mesma pessoa (o tesoureiro, `usuario_14`); os de 03/11 a 13/11 aguardam fechamento. Por isso o passo "Assinar" da tela é do próprio tesoureiro, e um botão de pedido de assinatura não foi construído.
- O catálogo de ferramentas da base diz que `liberar_lote` (assinar o lote) é do perfil `aprovador`, o que contradiz o histórico (tesoureiro assinando). Não sei qual vale na Gogroup.
- **Resposta de bolso:** "Hoje o tesoureiro gera e assina. Numa implantação real, dá para separar as funções: o Conferente enviaria ao aprovador um pedido de assinatura, já com o resumo do que foi alterado (títulos retirados, corrigidos e cancelados)." É uma evolução, não parte desta entrega.

## Se o fornecedor confirmar antes do fechamento: devolver o título ao lote (na demo, SIMULADO)
- **O que existe na tela:** no dossiê de cada fornecedor, o bloco "Se o fornecedor confirmar que está tudo certo, devolva ao lote antes do fechamento" lista os títulos que o agente retirou, com o horário em que o lote fecha.
- **Ordem obrigatória:** os botões só são liberados **depois de enviar os e-mails de contato** da seção (e esse envio só libera depois de marcar como lido). A resposta de quem entrou em contato é o que justifica devolver. O envio da outra seção (aprovação) não libera.
- **Quem autoriza (regra de alçada):** a pessoa que entrou em contato com o fornecedor (no dia 13/11, Renata Paiva, alçada R$ 50.000) **autoriza a devolução de títulos até a alçada dela**, sem novo pedido de aprovação. Por isso, no Embalarte, os 5 títulos têm "Devolver ao lote", inclusive os de R$ 6,3 mil e R$ 8,2 mil. Acima da alçada dela (ou se ela não tiver alçada no cadastro) o botão vira "Pedir aprovação para devolver". Isso segue a regra da base: `agendar_titulo` só dispensa aprovação até R$ 5 mil para o analista, e acima disso exige aprovador (até R$ 50 mil) ou a diretora; aqui, quem fez o contato já é aprovador com alçada suficiente.
- **Confirmação por e-mail (a mesma revisão dos outros envios):** clicar em qualquer botão abre a janela "Revisar antes de enviar" (aviso de simulação, o e-mail completo, caixa "Revisei o e-mail e confirmo…"). Só depois de confirmar o título volta. Dentro da alçada, o e-mail é um **registro** para quem autorizou ("devolvido ao lote, autorizado por …, dentro da alçada de R$ …"), para auditoria. Acima da alçada, é o **pedido ao aprovador** (aprovador até R$ 50 mil, diretora acima). Os dois aparecem na Caixa de saída, em "devoluções ao lote", com o status (registrado, aguardando aprovação, aprovado ou reprovado) e o rascunho `.eml`.
- **Pedido ao aprovador:** o título **continua fora do lote** e aparecem dois botões de ensaio, "Simular: aprovou" e "Simular: reprovou". Aprovou: volta ao lote (os totais do topo mudam). Reprovou: continua fora e o caso se encerra. Em produção o aprovador decide no ERP (que já guarda o log de aprovações) e o status do título na tela do tesoureiro muda; se a decisão chegar depois do fechamento, o ERP recusa e o título segue no próximo lote.
- **Como funciona no ERP simulado:** é a ferramenta `agendar_titulo` (devolve o título a um lote aberto). Ela recusa lote já fechado e título cancelado.
- **Limites, para dizer antes que perguntem:** o botão não é travado pelo relógio da página (o prazo é o horário do lote exibido; no ERP real, depois do fechamento a ação é recusada). Nada é gravado no ERP: a tela só guarda o estado no navegador. A resposta do contato (que o título está certo) é uma premissa do tesoureiro, a tela não a verifica. A correção do dado em si (por exemplo, a conta bancária) acontece fora da tela; o agente não roda de novo sozinho quando o fornecedor responde.
- **Custo de segurar um título:** a própria base diz que retirar do lote um título legítimo e não devolver a tempo custa multa, juros e custo de relacionamento. Por isso o prazo importa e o botão está ao lado do horário de fechamento.
- **Na demo:** depois de enviar os e-mails de contato, clique "Devolver ao lote" num título (um de R$ 6,3 mil ou R$ 8,2 mil mostra bem a regra de alçada), mostre a janela de revisão, marque a caixa e envie: o título volta, os totais do topo mudam e o chip diz "autorizado por Renata Paiva". Se sobrar tempo, mostre o registro na aba Caixa de saída.
