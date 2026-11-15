# Planejamento por entrega — Implementation Plan

> Executado em sessão (nativo). Sem commits até o Vitor dizer que a tela está 100%.

**Goal:** trocar a tela de 5 abas por agenda semanal + página por entrega, com marcações salvas no banco e vistas no admin.

**Architecture:** conteúdo continua num jsonb (`planejamentos.content`) com novo formato (estratégia + semanas + entregas). Marcações numa tabela própria, gravadas por server action pelo slug. Tela do cliente é um client component com navegação por hash e CSS Module.

**Tech Stack:** Next 16 (app router, server actions), Supabase, OpenAI Responses API (json_schema strict), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-planejamento-entregas-design.md`

## Global Constraints

- Textos de fala, telas e legenda copiados palavra por palavra (prompt).
- Alvos de toque ≥ 48px; texto base 17px; tema claro e escuro.
- Nada de cliente (cobrança etc.) no Backlog da Tatu.

## Review Focus

- Entrega sem dia válido (0 ou > dias do mês): descartada no parse.
- Duas entregas no mesmo dia e tipo: id único por índice, não por dia+tipo.
- Marcação com entrega ou passo inexistente: recusada na action.
- Planejamento antigo (formato v1): abre como "sendo preparado", sem quebrar.
- Mês sem `ano/mes` da IA: cai no mês de `created_at`.

---

### Task 1: Tipos, parse e passos

**Files:** Modify `lib/planejamentoTypes.ts`; Test `tests/planejamentoTypes.test.ts`

**Produces:** `PlanejamentoContent { ano, mes, resumo, fatos[], comQuemFalamos, comoFunciona[], regras[], tomDeVoz[], linhas[{titulo,descricao}], rotina[{dia,texto,tipo}], avisos[], semanas[{numero,inicio,fim,tema,objetivo}], entregas: Entrega[] }`; `Entrega { id, dia, semana, tipo:"feed"|"stories", titulo, curto, linha, formato, marco, card, fala, telas[], comoFazer[], legenda, observacao, referencias[{titulo,url}] }`; `parseContent(raw, fallback: Date)`; `passosDa(e): {id:"g"|"p", label}[]`.

- [ ] Testes: entrega com dia 31 em novembro é descartada; ids únicos `e0..`; v1 vira `entregas: []`; `passosDa` dá os rótulos do spec; referência sem http é descartada.
- [ ] Implementar e rodar `npx vitest run tests/planejamentoTypes.test.ts`.

### Task 2: IA no novo formato

**Files:** Modify `lib/planejamentoAi.ts`. Schema = Task 1 sem `id`. Prompt mantém regras de cópia literal. Verificar rodando no artifact da Ana (script no scratchpad).

### Task 3: Marcações

**Files:** Create `supabase/migrations/0111_planejamento_marcacoes.sql`, modify `lib/planejamentos.ts`, create `app/planejamento/[slug]/actions.ts`.

**Produces:** `listMarcacoes(planejamentoId): Promise<string[]>` (chaves `"<entregaId>:<passo>"`); `marcarPasso(slug, entregaId, passo, feito)` server action que valida entrega e passo.

### Task 4: Tela do cliente

**Files:** Rewrite `components/planejamento/PlanejamentoView.tsx`, create `components/planejamento/planejamento.module.css`, modify `app/planejamento/[slug]/page.tsx`. Portar o protótipo aprovado; marcação otimista com `useOptimistic`/estado local e chamada à action.

### Task 5: Admin

**Files:** Modify `app/admin/planejamentos/page.tsx`: "x de y prontas" e lista recolhível das entregas com o que foi marcado.

### Task 6: Verificação

Reimportar o da Ana, abrir no celular (375px), marcar um passo, conferir no banco e no admin, tema escuro.
