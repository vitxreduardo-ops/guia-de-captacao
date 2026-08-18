-- Lista de tarefas do hub do admin. É uma lista só, compartilhada pelo time:
-- qualquer usuário logado vê e mexe nas mesmas tarefas. Guarda quem criou e
-- quem concluiu só pra dar contexto na tela, não pra restringir acesso.
--
-- Tarefa concluída some sozinha 15 dias depois de ser marcada como feita —
-- a limpeza é preguiçosa (roda na leitura, em lib/dailyTodos.ts), porque o
-- projeto não tem cron. Tarefa pendente não expira.

create table if not exists daily_todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  completed_at timestamptz,
  created_by uuid references users(id) on delete set null,
  completed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- A limpeza varre por completed_at; o índice parcial cobre só as concluídas.
create index if not exists daily_todos_completed_at_idx
  on daily_todos(completed_at)
  where completed_at is not null;

alter table daily_todos enable row level security;
