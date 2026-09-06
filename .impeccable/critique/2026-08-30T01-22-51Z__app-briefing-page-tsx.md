---
target: formulário de briefing (/briefing)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
timestamp: 2026-08-30T01-22-51Z
slug: app-briefing-page-tsx
---
# Crítica: formulário de briefing (/briefing)

Método: dual-agent (A: revisão de design · B: detector + evidência de navegador).
Defasagem: avaliações rodaram antes de três mudanças (Geist no body, tela própria
pro serviço, contador de passos).

## Nota de saúde de design

| # | Heurística | Nota | Questão |
|---|---|---|---|
| 1 | Visibilidade do status | 3/4 | Troca de passo silenciosa; foco cai no body |
| 2 | Correspondência com o mundo real | 4/4 | Fala como o cliente fala |
| 3 | Controle e liberdade | 1/4 | Chip não desmarca; sem form; sem rascunho; Voltar ativo no envio |
| 4 | Consistência e padrões | 2/4 | Dois focos; verba minúscula; title da ferramenta interna |
| 5 | Prevenção de erro | 1/4 | WhatsApp aceita "abcdef" |
| 6 | Reconhecer em vez de lembrar | 2/4 | Chip sem estado acessível; "Qual" órfão; sem revisão |
| 7 | Flexibilidade e eficiência | 2/4 | Sem autocomplete/inputMode; 20 paradas de tab |
| 8 | Estético e minimalista | 2/4 | Sem marca, sem cor, sem sinal de ofício |
| 9 | Recuperação de erro | 1/4 | Sem role=alert, sem foco, sem canal alternativo |
| 10 | Ajuda e documentação | 2/4 | Dica em 8 de ~28 campos; sem orientação de página |
| **Total** | | **20/40** | Abaixo da média |

## Especificidade

Autoral na escrita, genérico na interface. Perguntas inconfundíveis do estúdio
("O que não pode", "No dia da captação, quem manda"); superfície é Tailwind
neutro sem marca, cor ou voz tipográfica.

Detector estático: limpo (exit 0). Navegador: contraste baixo em text-neutral-400
(2,6:1) e fonte única 100%. Fonte já corrigida (era Arial forçado no body).
Sem erro de console; sem estouro a 375px.

## Funcionando

- Passos condicionais honestos: stepsFor derruba passos vazios; barra não promete total falso.
- Validação no servidor filtra contra respostas já aceitas, em ordem de dependência.
- Voz em primeira pessoa que baixa a guarda do cliente.

## Prioridades

P1 WhatsApp sem validação (type=text, sem inputMode/autocomplete). Lead morre em
silêncio. Fix: type=tel, inputMode numeric, 10-11 dígitos cliente+servidor, form real.
Comando: harden

P2 Tela final joga fora o pico-fim. Uma frase em viewport vazia, barra some,
retenção de 30 dias nunca dita. Fix: barra cheia, marca, retenção, eco do enviado,
link de WhatsApp. Comando: delight

P3 Chips sem estado acessível; foco perdido a cada passo. Fix: radiogroup/radio
aria-checked, tabindex móvel, foco no h1, marca de seleção não-cromática.
Comando: audit

P4 Contraste 2,6:1 em todo texto auxiliar (contador, dicas, "(opcional)").
Fix: neutral-500. Comando: audit

P5 Página se apresenta como a ferramenta interna (title e description herdados);
zero reafirmação em cinco momentos de risco. Fix: metadata própria, cabeçalho com
marca, linha de privacidade sob WhatsApp, enquadramento da verba. Comando: clarify

## Personas

- Indeciso ("Ainda não sei"): duas caixas vazias sem exemplo; quem mais precisa recebe menos.
- Sensível a preço: chega na verba sem nenhuma prova de valor.
- Celular: teclado alfabético no telefone, chips de 34px, sem rascunho nem aviso de saída.
- Leitor de tela: não percebe seleção nem troca de passo.

## Menores

"Tom e prático" é slug. "Sobre esse trabalho" x "Como vai ser feito" indistintos.
Verba minúscula. "Qual" órfão e opcional. Revelação sem transição empurra 300px.
Voltar ativo no envio. ERROR_MESSAGES.campos morto. ~430px de vazio no desktop.

## Perguntas

- O que o cliente aprendeu sobre seu gosto se este formulário for a única exposição?
- Dá pra enviar com quatro respostas: o que a mensagem no WhatsApp está avisando?
- O texto é em primeira pessoa; por que a pessoa nunca aparece nem assina?
