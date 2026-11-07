# Conferente de Pagamentos

Confere o lote bancário antes de fechar: um motor de regras (código) acha o que está suspeito, e um agente de IA investiga com ferramentas, age dentro da alçada e escala para uma pessoa o que a política exige. Dados sintéticos do GoHacks Talent 2026 (desafio 2, Pagamentos). O ERP é **simulado**.

## Como rodar

```
node rodar.js 20261103 [20261104 ...]   # motor → agente → página → histórico (precisa de .env com AI_PROXY_API_KEY)
node pagina.js                           # só regenera saida/index.html a partir da última rodada
node --test tests/                       # testes de regras, ERP, e-mails e tela, sem IA e sem rede
node verifica.js                         # confere as ações do agente contra os CSVs (independente do ERP)
```
A tela do tesoureiro é `saida/index.html` (um HTML único, funciona offline). O token fica em `conferente/.env` (fora do git).

## Módulos

| Arquivo | Papel |
|---|---|
| `politica.js` | **Toda** a política numérica (alçadas, tolerâncias, janelas). O prompt do agente é gerado daqui. |
| `titulos.js` | A regra única de "estes dois títulos são o mesmo?" (duplicidade). Motor e ERP usam esta. |
| `dados.js` | Seam de dados: adapter CSV (padrão) e em memória (`dados.usar({...})`, usado nos testes). |
| `engine.js` | `classificar(lote)` → libera / segura / bloqueia por título. Também roda por linha de comando. |
| `erp.js` | ERP simulado, ferramentas do agente e as **travas** (alçada, evidência, gêmeo para cancelar, um contato por fornecedor, título escalado sai do lote). `desfecho()` é o veredito final do título. |
| `agente.js` | Laço do agente (LLM com chamada de ferramentas). `resolver(..., chat)` aceita um chat falso nos testes. |
| `comunicacoes.js` · `llm.js` | Sinais objetivos dos e-mails (código) e leitura do texto (IA). A IA só sobe o risco. |
| `emails.js` | Monta os e-mails de escalonamento com o **dossiê completo** (por quê, telefone do cadastro, perguntas, se confirmar/negar, títulos, provas, prazo) para as pessoas certas. **Puro: não envia nada.** Também monta o registro e o pedido de **devolução ao lote** (alçada de quem fez o contato × aprovador). A tela usa o mesmo módulo; o "envio" é simulado (Caixa de saída e rascunho .eml). Em produção entraria um adaptador (SMTP, Outlook, Gmail). |
| `saida.js` | Único lugar que sabe os arquivos de `saida/`, os cortes de data e o histórico. |
| `pagina.js` · `pagina.template.html` | Gera a tela. |
| `verifica.js` | Verificador independente: usa só os **números** da política, não o código do ERP. |

## Princípio

As travas que protegem dinheiro são calculadas em **código**, não em prompt. A "evidência" que o modelo escreve não conta: o ERP confere sozinho (por exemplo, só cancela se achar um título gêmeo mais antigo).

## Marca (`marca/`)
`logo.png`, `logo-tagline.png` e `simbolo.png` são recortes, sem alteração, das páginas do brandbook do GoHacks Talent; `poppins-*.woff2` é a tipografia (subconjunto latino). Paleta: azul `#2659a5` (protagonista), amarelo `#d7d900`, vermelho `#e5273c`, ciano `#3dbfef`, fundo `#f3f3f3`. Regras do brandbook que seguimos: não recolorir nem distorcer o logo, escrever "Gogroup" exatamente assim, não usar branco sobre amarelo/ciano, não pôr laranja, vermelho e rosa lado a lado.
