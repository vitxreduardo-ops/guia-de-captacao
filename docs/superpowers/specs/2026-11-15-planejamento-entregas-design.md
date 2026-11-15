# Planejamento do cliente: tela por entrega

Aprovado pelo Vitor em 15/11/2026 a partir do protótipo
https://claude.ai/artifact/QouSJwa2bT66ZEBJ7X3GM1 (conteúdo real da Dra. Ana Júlia).

## Por quê

A primeira versão (5 abas: estratégia, rotina, calendário, roteiros, referências)
ficou confusa: o roteiro ficava longe do post e o calendário virou lista. O
cliente (18 a 70 anos, no celular) precisa abrir a semana, tocar num conteúdo e
ter tudo daquele conteúdo num lugar só, e marcar o que já gravou e postou. A
Tatu precisa ver essas marcações no admin.

## O que muda

- **Unidade da tela = entrega.** Cada post/story tem sua página: por quê (linha
  de conteúdo + objetivo da semana), passos marcáveis, texto do card, fala pra
  câmera (copiar), telas numeradas, como fazer, legenda (copiar), referências,
  observação, anterior/próxima.
- **Agenda por semana:** progresso do mês, cartão "próxima entrega" (ou "ficou
  pra trás"), botões de semana com tema e objetivo, faixa seg→dom com bolinhas
  (quinta de plantão sombreada quando a rotina diz), cartões de entrega com os
  passos marcáveis.
- **Aba Estratégia:** resumo, etiquetas, com quem fala, sua semana (rotina),
  linhas de conteúdo, tom de voz e regras recolhidos.
- **Marcações no banco** (tabela `planejamento_marcacoes`), gravadas pela página
  pública pelo slug (quem tem o link marca) e mostradas no admin como
  "x de y prontas" + lista de entregas.
- **IA devolve o novo formato:** semanas + entregas com textos copiados palavra
  por palavra, mais a estratégia. Mês e ano vêm da IA pra calcular dia da semana.

## Passos marcáveis (regra no código, não na IA)

- Stories com fala ou telas: "Gravei", "Postei". Stories sem: "Fotografei", "Postei".
- Feed com "carrossel" no formato: "Separei as fotos", "Postei".
- Outro feed: "Revisei a legenda", "Postei".

## Fora do escopo agora

Editar campos à mão, imagens do ZIP, comparação com Gemini Flash (fica pro fim).

## Decisões minhas (Claude)

- Estilo em CSS Module próprio da tela (tokens Tatu: oliva, creme, ink; Bootzy
  nos títulos, Geist no texto), com tema escuro por `prefers-color-scheme`.
- Navegação por hash (`#semana-2`, `#p17-stories`, `#estrategia`), sem rotas novas.
- Planejamento antigo (formato de 5 abas) não é migrado: o da Ana é reimportado.
