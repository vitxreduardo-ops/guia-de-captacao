-- Uma tarefa passa a aceitar mais de um responsável.
--
-- Tabela de junção em vez de coluna array: responsável é uma entidade com
-- tabela própria, então dá pra manter a integridade referencial. Com array, o
-- id de um usuário excluído ficaria pendurado dentro da tarefa.
--
-- O on delete cascade no user_id repete o efeito do on delete set null que a
-- coluna antiga tinha: sai o usuário, a tarefa fica sem aquele responsável.

create table if not exists daily_todo_assignees (
  todo_id uuid not null references daily_todos(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (todo_id, user_id)
);

-- Pra responder "o que é meu" sem varrer a tabela toda.
create index if not exists daily_todo_assignees_user_id_idx
  on daily_todo_assignees(user_id);

-- Move o responsável único que já existia. Roda antes do drop, então nada se
-- perde.
insert into daily_todo_assignees (todo_id, user_id)
select id, assignee_id
from daily_todos
where assignee_id is not null
on conflict do nothing;

-- Duas fontes de verdade divergem: a coluna sai agora que os dados mudaram de
-- lugar.
alter table daily_todos drop column if exists assignee_id;

alter table daily_todo_assignees enable row level security;
