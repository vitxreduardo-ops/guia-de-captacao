-- Checklist por material do backlog: lista de tarefas dentro de um card
-- (roteirizar, captar, editar legenda, agendar...). Vive no mesmo drawer de
-- edição usado pelo kanban e pelo calendário.

create table if not exists backlog_checklist_items (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references backlog_cards(id) on delete cascade,
  position integer not null default 0,
  label text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists backlog_checklist_items_card_id_idx
  on backlog_checklist_items(card_id);

alter table backlog_checklist_items enable row level security;
