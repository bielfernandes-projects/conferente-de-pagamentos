# Conferente de Pagamentos

Projeto do **GoHacks Talent 2026 (Gogroup), desafio 2: Pagamentos.** Um agente de IA que confere o lote bancário **antes** de o dinheiro sair: um motor de regras (código) acha o que está suspeito, e o agente investiga com ferramentas, age dentro do limite do analista (R$ 5 mil) e escala para uma pessoa, com dossiê pronto, o que a política exige. Quem aprova e quem entra em contato com o fornecedor é sempre uma pessoa.

> Dados sintéticos. O ERP é **simulado** (as ações vão para um estado em arquivo, não para um sistema real).

## O que tem aqui

| Pasta | O que é |
|---|---|
| [`conferente/`](conferente/README.md) | O sistema: motor de regras, ERP simulado com as travas, agente, tela do tesoureiro e testes |
| [`pitch/`](pitch/) | O deck dos 5 minutos (formato do workshop, kit de marca) e os prints do plano B |
| `PITCH.md` | Esqueleto SOAR, roteiro dos 5 minutos, o que **não** prometer na banca |
| `VERIFICACAO.md` | O diário de como a IA foi dirigida, verificada e corrigida (base do relatório individual) |

## Como rodar

Precisa de Node 22+ (sem dependências) e dos CSVs do desafio (veja abaixo).

```bash
node conferente/rodar.js 20261103                  # motor → agente → página → histórico (precisa de conferente/.env com AI_PROXY_API_KEY)
node conferente/rodar.js --continuar 20261111      # acrescenta mais dias à rodada anterior, sem refazer o que já foi verificado
node --test conferente/tests/ pitch/               # testes: sem IA e sem rede
node pitch/gerar.js                                # regenera o deck (antes: conferente/pagina.js, conferente/duplicidades.js e pitch/capturas.js)
```
A tela do tesoureiro fica em `conferente/saida/index.html` (abre no dia mais recente; link direto: `#dia-2026-11-03`). O deck fica em `pitch/pitch.html` (setas navegam, N notas, T cronômetro, F tela cheia).

## Dados do desafio (não estão no repositório)

A base é da organização do evento. Para rodar, extraia o zip `GoHacks_Talent_2026_bases_csv.zip` em `base-de-dados/` de modo que exista `base-de-dados/GoHacks_Talent_2026_bases_csv/pagamentos/*.csv`. O kit de marca original (brandbook) também não está aqui; os recortes de logo e fontes usados estão em `conferente/marca/`.

## Segurança

- O token do AI Proxy fica em `conferente/.env` (`AI_PROXY_API_KEY=...`), **fora do git** (`.gitignore`). Nunca coloque o token em código, log ou mensagem.
- Princípio de projeto: as travas que protegem dinheiro são calculadas em **código**, não em prompt. A justificativa que o modelo escreve não vale; o sistema confere sozinho.

## Para quem vai avaliar (abra sem rodar nada)

| O quê | Onde | Para quê |
|---|---|---|
| **Tela do tesoureiro** | [`conferente/saida/index.html`](conferente/saida/index.html) (baixe e abra no navegador) | Abre em **"Hoje" (13/11)**. Mostra, dia a dia, o que o agente fez e qual é o próximo passo da pessoa. Cada caso tem o passo a passo do agente. |
| **Deck do pitch (5 min)** | [`pitch/pitch.html`](pitch/pitch.html) | Setas navegam, **N** mostra as notas de fala, **T** liga o cronômetro. Os 3 últimos slides são o plano B. |
| **Como a IA foi dirigida e verificada** | [`VERIFICACAO.md`](VERIFICACAO.md) | Cada entrega da IA, como foi conferida, onde errou e como foi corrigida. |
| **Visão de produto: botão "Enviar e-mails"** | Na tela, dentro de cada seção de "Seus próximos passos", liberado depois de "Marcado como lido" (e na aba **Caixa de saída**) | O tesoureiro revisa os dossiês, confirma e "envia" os e-mails para quem deve resolver. **É simulado: nada é enviado de verdade**; mostra o que o produto teria, e as integrações (SMTP, Outlook, Gmail) ficam como evolução. |
| **Roteiro e premissas** | [`PITCH.md`](PITCH.md) | Esqueleto SOAR, roteiro e o que **não** prometemos (ex.: os R$ 404 mil são "pagos a mais" pela nossa regra; o tempo manual é premissa a validar). |

**Testes** (`node --test conferente/tests/ pitch/`): os de regras, duplicidades, tela e deck rodam sem nada; os que usam títulos reais do desafio precisam da base em `base-de-dados/` (veja acima). O agente de IA só roda com o token do AI Proxy; a tela e o deck já trazem o resultado de uma rodada completa (03/11 a 13/11).
