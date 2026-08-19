-- Notificações: avisam a pessoa quando um material do backlog ou uma tarefa do
-- painel passa a ser responsabilidade dela, e quando algo acontece com o que
-- ela já é responsável (mudança de coluna, aprovação). Quem causou o evento
-- nunca é notificado do próprio ato.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (
    kind in ('card_assigned', 'todo_assigned', 'card_moved', 'card_approved')
  ),
  title text not null default '',
  body text not null default '',
  link text,
  entity_id uuid,
  actor_id uuid references users(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- A consulta da campainha é sempre "as minhas, mais recentes primeiro", com o
-- não lido contado à parte.
create index if not exists notifications_user_idx
  on notifications(user_id, created_at desc);

create index if not exists notifications_unread_idx
  on notifications(user_id) where read_at is null;

alter table notifications enable row level security;
