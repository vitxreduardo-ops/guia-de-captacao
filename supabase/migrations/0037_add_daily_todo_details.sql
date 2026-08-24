-- A lista de tarefas do hub deixa de ser só texto + responsável e passa a ter
-- os mesmos recursos do card do kanban: detalhes num painel, checklist,
-- prioridade e ordem manual.
--
-- `position` existe porque a ordem passa a ser arrastável. O backfill numera
-- pela ordem que a tela já mostrava (mais antiga em cima), então nada muda de
-- lugar na primeira carga depois da migration.
--
-- `priority` é 1..3 com 1 = mais urgente. Ordem crescente = mais urgente
-- primeiro, que é o que a tela ordena.

alter table daily_todos
  add column if not exists notes text not null default '';

alter table daily_todos
  add column if not exists due_date date;

alter table daily_todos
  add column if not exists priority smallint not null default 2
    check (priority between 1 and 3);

alter table daily_todos
  add column if not exists position integer not null default 0;

update daily_todos as t
set position = ordered.row_number - 1
from (
  select id, row_number() over (order by created_at) as row_number
  from daily_todos
) as ordered
where t.id = ordered.id and t.position = 0;

-- A lista pendente é lida inteira e ordenada por position; o índice cobre
-- exatamente essa varredura.
create index if not exists daily_todos_position_idx on daily_todos(position);

-- Checklist da tarefa. Mesma forma da checklist do backlog
-- (0023_add_backlog_checklist.sql): tabela própria, ordenada por position,
-- some junto com a tarefa.
create table if not exists daily_todo_checklist_items (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references daily_todos(id) on delete cascade,
  position integer not null default 0,
  label text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists daily_todo_checklist_items_todo_id_idx
  on daily_todo_checklist_items(todo_id);

alter table daily_todo_checklist_items enable row level security;
