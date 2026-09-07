-- Ajustes do quadro de entregas: mais de um responsável por card, tipo de
-- contrato (mensal ou freela) e um produto escrito à mão.

-- Tabela de junção em vez de coluna array, como em daily_todo_assignees: com
-- array, o id de um usuário excluído ficaria pendurado dentro do card.
create table if not exists backlog_card_assignees (
  card_id uuid not null references backlog_cards(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, user_id)
);

create index if not exists backlog_card_assignees_user_id_idx
  on backlog_card_assignees(user_id);

-- Move o responsável único que já existia. Roda antes do drop, então nada se
-- perde.
insert into backlog_card_assignees (card_id, user_id)
select id, assignee_id
from backlog_cards
where assignee_id is not null
on conflict do nothing;

-- Duas fontes de verdade divergem: a coluna sai agora que os dados mudaram de
-- lugar.
drop index if exists backlog_cards_assignee_id_idx;
alter table backlog_cards drop column if exists assignee_id;

alter table backlog_card_assignees enable row level security;

-- Mensal é o que já está no contrato do mês; freela é o trabalho avulso. Fica
-- nulo enquanto ninguém disser, porque o backlog do Instagram não usa isso.
alter table backlog_cards
  add column if not exists contract_type text
    check (contract_type in ('mensal', 'freela'));

-- Entrega negociada fora da tabela de preços: o nome vale só para este card e
-- não polui o catálogo de produtos e serviços.
alter table backlog_cards
  add column if not exists custom_service text;
