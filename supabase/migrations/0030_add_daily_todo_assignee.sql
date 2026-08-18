-- Responsável da tarefa, escolhido clicando na bolinha no hub do admin.
-- Fica separado de created_by de propósito: quem criou é histórico e não muda,
-- quem é responsável muda quando a tarefa passa pra outra pessoa.
--
-- O backfill deixa o criador como responsável inicial, então as tarefas que já
-- existem continuam mostrando a mesma bolinha de antes.

alter table daily_todos
  add column if not exists assignee_id uuid references users(id) on delete set null;

update daily_todos set assignee_id = created_by where assignee_id is null;
