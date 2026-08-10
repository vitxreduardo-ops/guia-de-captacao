-- Migração: adiciona o bloco "Referências" ao Orçamento — galeria de imagens
-- de referência visual no nível do orçamento (mesmo conceito de
-- visual_references/photo_items do Guia, mas sem coluna "selected", já que a
-- página pública do orçamento é somente leitura).

create table if not exists budget_references (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default ''
);

create index if not exists budget_references_budget_id_idx on budget_references(budget_id);

alter table budget_references enable row level security;

-- Reaproveita o bucket "guide-references" já existente (uploads ficam em
-- budgets/{budget_id}/... dentro dele) — não precisa criar bucket novo.
