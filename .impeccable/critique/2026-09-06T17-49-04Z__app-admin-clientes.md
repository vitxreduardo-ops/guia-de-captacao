---
target: seção Clientes (/admin/clientes)
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
timestamp: 2026-09-06T17-49-04Z
slug: app-admin-clientes
---
# Crítica: seção Clientes (/admin/clientes)

Método: dual-agent (A: revisão de design · B: detector + evidência de navegador).
Modo: Operate. Detector limpo (0 achados em 8 arquivos); a evidência dura veio da
medição no navegador.

## Nota de saúde de design

| # | Heurística | Nota | Questão |
|---|---|---|---|
| 1 | Visibilidade do status | 2 | "Fechar mês" e "Reabrir mês" não têm pending nem confirmação de sucesso; a página só recarrega. |
| 2 | Correspondência com o mundo real | 1 | "Data de post" nomeia o campo que decide a competência da nota; "Novo material"/"Nenhum material" num quadro de entregas. |
| 3 | Controle e liberdade | 2 | "Reabrir mês" apaga a nota (DELETE em `lib/billing.ts`), em link vermelho de 12px, sem confirmar. |
| 4 | Consistência e padrões | 3 | Padrões internos coerentes; dois modelos de dinheiro (cards vivos × notas fechadas) convivem sem sinalização. |
| 5 | Prevenção de erro | 0 | Fechamento dispara direto; refechar substitui o snapshot; preço em branco entra na nota valendo zero. |
| 6 | Reconhecer em vez de lembrar | 1 | A regra do `billable` e da data-competência só aparece no estado vazio, e some quando há dados. |
| 7 | Flexibilidade e eficiência | 2 | Filtro por GET é compartilhável, mas o mês default é o corrente e o trabalho é sempre sobre o anterior. |
| 8 | Estética e minimalismo | 3 | Sóbrio e limpo; hierarquia plana — três `h2` de mesmo peso competem com o bloco de fechamento. |
| 9 | Recuperação de erros | 1 | Nenhum `error.tsx` nas quatro rotas; erro de Supabase derruba a página. Preço inválido vira zero em silêncio. |
| 10 | Ajuda e documentação | 1 | Só um `title` nativo no badge "nota" — invisível no iPhone, que é onde o dono confere. |
| **Total** | | **16/40** | **Aceitável, com trabalho significativo a fazer** |

## Veredito de especificidade

Meio-termo puxando para o genérico, com bolsões de autoria real: o `billable` por
coluna, o snapshot de itens em `closeMonth`, o `parseBRLToCents` posicional e o chip
de dinheiro no card do kanban. A carcaça em volta é CRUD de admin de prateleira, e o
vocabulário do backlog de Instagram vazou inteiro para o quadro de entregas.

Detector determinístico: `impeccable detect --json` sobre os oito arquivos do escopo
retornou `[]`, exit 0. Sanity check em `components/` acusou dois `[gray-on-color]`
fora do escopo, então o detector está vivo — o escopo é que está limpo pelas regras
dele. Nenhum overlay foi injetado.

## O que está funcionando

1. O snapshot de `closeMonth` copia descrição, quantidade e preço em vez de referenciar
   o card: mover ou apagar o card depois não muda o que foi cobrado.
2. Dinheiro em centavos inteiros, com `formatBRL`/`parseBRLToCents` fora do `server-only`.
3. Filtro por GET: o link `?cliente=X&mes=2026-08-01` é colável no WhatsApp do estúdio.

## Problemas prioritários

- **[P0] "Fechar mês" e "Reabrir mês" não perguntam nada.** Um toque errado no iPhone
  reescreve ou apaga o que foi cobrado de um cliente. Corrigir com confirmação nomeando
  cliente, mês, contagem de itens e total.
- **[P1] "Editar" é inalcançável no iPhone.** `opacity-0 group-hover:opacity-100` em
  `ClientRegistry` e no header de coluna do `KanbanBoard`; medido em viewport móvel:
  `(hover: hover) === false`, as seis instâncias ficam em `opacity: 0` para sempre.
- **[P1] O modelo de dinheiro é invisível e some quando importa.** A explicação só existe
  no estado vazio do Faturamento; e o campo que decide a competência se chama "Data de post".
- **[P1] Alvos de toque muito abaixo de 44px.** "Editar" 32×16, "Galeria" 57×18,
  limpar filtro 24×24, "+" 30×34, engrenagem 36×36.
- **[P1] Contraste reprovado.** Botão "Editar" `#a1a1a1` sobre branco = 2.58:1; badge
  "rascunho" `#737373` sobre `#f5f5f5` a 11px = 4.35:1.
- **[P2] O mês default é o corrente**, e o trabalho é sempre sobre o anterior.
- **[P2] Entregas e faturamento contam por réguas diferentes** sem dizer: "12 entregas
  no ano · R$ 0,00 faturado" lê como erro, não como "meses ainda não fechados".

## Carga cognitiva

Falham 4 dos 8 itens: foco único (quatro assuntos numa página), memória de trabalho
(a regra do dinheiro não está na tela), divulgação progressiva (invertida) e hierarquia
visual (nada domina). Pontos de decisão acima de 4 opções: seletor de 12 meses, seletor
de clientes sem busca, seletor de serviços sem agrupamento.

## Jornada emocional

O vale está no começo: abrir a tela no dia 1º para faturar o mês anterior e ver
"R$ 0,00 · Nenhuma entrega concluída neste mês" — quando o mês é que está errado. O pico
deveria ser o fechamento, e é anticlimático: um botão que dispara sem perguntar, e uma
linha verde de recompensa sem nada copiável para o emissor de nota.

## Observações menores

- `YearBarChart` zerado renderiza doze barras de 2px sem estado vazio; parece bug.
- O gráfico não tem resumo textual: um leitor de tela ouve doze imagens soltas.
- Nenhum `loading.tsx` nas quatro rotas, todas `force-dynamic`.
- `ClientTabs` quebra em duas linhas a 375px (wrap, não scroll), custando ~120px de altura.
- `ServiceCatalog` vazio não tem estado vazio: só o formulário, sem dizer para que serve.
- `deleteService` apaga direto; cards antigos passam a mostrar "Sem serviço" retroativamente.

## Perguntas

1. Se o trabalho termina quando o valor é transcrito para a nota fiscal, por que o produto
   para em "R$ X na nota" e não entrega a lista em formato copiável?
2. Se o uso principal é no iPhone, por que a ação de dinheiro exige dois selects e um botão "Ver"?
3. Por quanto tempo "Data de post" vai ser mais barato do que o mês faturado errado que ele causa?
