# Conferente de Pagamentos

Projeto do **GoHacks Talent 2026 (Gogroup), desafio 2: Pagamentos.** Um agente de IA que confere o lote bancário **antes** de o dinheiro sair: um motor de regras (código) acha o que está suspeito, e o agente investiga com ferramentas, age dentro do limite do analista (R$ 5 mil) e escala para uma pessoa, com dossiê pronto, o que a política exige. Quem aprova e quem liga é sempre uma pessoa.

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
