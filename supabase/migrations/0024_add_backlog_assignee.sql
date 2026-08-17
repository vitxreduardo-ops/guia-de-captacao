-- Responsável pelo material do backlog. Aponta pra tabela `users`, a mesma
-- que controla o acesso ao admin, pra não manter um cadastro paralelo de
-- equipe. `on delete set null`: tirar o acesso de alguém não apaga o material,
-- só deixa ele sem responsável.

alter table backlog_cards
  add column if not exists assignee_id uuid references users(id) on delete set null;

create index if not exists backlog_cards_assignee_id_idx
  on backlog_cards(assignee_id);
