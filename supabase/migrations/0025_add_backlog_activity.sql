-- Atividade do material: histórico do que aconteceu com o card. Guarda as
-- movimentações entre colunas, as respostas das automações (ex: onde o
-- backup foi salvo) e os comentários escritos à mão.

create table if not exists backlog_card_activity (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references backlog_cards(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  kind text not null default 'note' check (kind in ('move', 'answer', 'note')),
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists backlog_card_activity_card_id_idx
  on backlog_card_activity(card_id, created_at desc);

alter table backlog_card_activity enable row level security;
