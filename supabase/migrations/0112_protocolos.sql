-- Protocolo de 8 dígitos por ordem de serviço: CCCC TTTT.
--
--   CCCC = código permanente do cliente (gallery_clients.client_code)
--   TTTT = sequência da tarefa dentro daquele cliente, começando em 0001
--
-- Tudo nasce no Postgres: o trigger de `backlog_cards` sorteia nada, só soma
-- um no contador do cliente dentro da mesma transação do insert. O app (e a
-- IA) não escolhe protocolo, e nenhum caminho de inserção escapa dele.
--
-- Texto, nunca inteiro: os zeros à esquerda fazem parte do protocolo.
-- Código 0000 é reservado à Tatu: cards sem cliente.
-- Protocolo nunca muda nem é reaproveitado: o contador só cresce e vive numa
-- tabela sem FK, então apagar cliente ou card não devolve número.

-- ------------------------------------------------------------ código do cliente

-- Sequence, não max()+1: apagar o último cliente não libera o código dele.
create sequence if not exists client_code_seq minvalue 1 maxvalue 9999 start 1;

alter table gallery_clients add column if not exists client_code text;

-- Backfill determinístico: do cliente mais antigo ao mais novo. Só preenche
-- quem ainda está sem código, então rodar de novo não sobrescreve nada.
do $$
declare r record;
begin
  for r in
    select id from gallery_clients where client_code is null order by created_at, id
  loop
    update gallery_clients
       set client_code = lpad(nextval('client_code_seq')::text, 4, '0')
     where id = r.id;
  end loop;
end $$;

alter table gallery_clients
  add constraint gallery_clients_client_code_format
  check (client_code ~ '^[0-9]{4}$' and client_code <> '0000');
alter table gallery_clients
  add constraint gallery_clients_client_code_unique unique (client_code);
alter table gallery_clients alter column client_code set not null;

create or replace function gallery_clients_assign_code() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    -- Ignora qualquer valor vindo do app: quem decide é a sequence.
    new.client_code := lpad(nextval('client_code_seq')::text, 4, '0');
  elsif new.client_code is distinct from old.client_code then
    raise exception 'client_code é permanente e não pode ser alterado';
  end if;
  return new;
end $$;

drop trigger if exists gallery_clients_assign_code on gallery_clients;
create trigger gallery_clients_assign_code
  before insert or update of client_code on gallery_clients
  for each row execute function gallery_clients_assign_code();

-- ------------------------------------------------------- contador por cliente

-- Sem FK de propósito: o contador sobrevive à exclusão do cliente.
create table if not exists client_task_counters (
  client_code text primary key check (client_code ~ '^[0-9]{4}$'),
  last_number integer not null default 0 check (last_number between 0 and 9999)
);
alter table client_task_counters enable row level security;

insert into client_task_counters (client_code, last_number)
values ('0000', 0)
on conflict do nothing;

-- Próximo número do cliente. Upsert numa linha só: duas transações ao mesmo
-- tempo se enfileiram no lock da linha e recebem números diferentes.
create or replace function next_task_number(p_client_code text) returns integer
language plpgsql as $$
declare n integer;
begin
  insert into client_task_counters as c (client_code, last_number)
  values (p_client_code, 1)
  on conflict (client_code) do update set last_number = c.last_number + 1
  returning last_number into n;
  return n;
end $$;

-- ------------------------------------------------------------ protocolo no card

alter table backlog_cards add column if not exists task_number integer;
alter table backlog_cards add column if not exists protocol_code text;

create or replace function backlog_cards_assign_protocol() returns trigger
language plpgsql as $$
declare code text; n integer;
begin
  if tg_op = 'INSERT' then
    select client_code into code from gallery_clients where id = new.client_id;
    code := coalesce(code, '0000');
    n := next_task_number(code);
    new.task_number := n;
    new.protocol_code := code || lpad(n::text, 4, '0');
  elsif old.protocol_code is not null
        and (new.protocol_code is distinct from old.protocol_code
             or new.task_number is distinct from old.task_number) then
    raise exception 'protocolo é permanente e não pode ser alterado';
  end if;
  return new;
end $$;

-- Backfill: cada cliente recebe 0001, 0002... na ordem de criação dos cards.
-- Roda antes do trigger existir, mas pelos mesmos contadores.
do $$
declare r record; code text; n integer;
begin
  for r in
    select c.id, g.client_code
      from backlog_cards c
      left join gallery_clients g on g.id = c.client_id
     where c.protocol_code is null
     order by c.created_at, c.id
  loop
    code := coalesce(r.client_code, '0000');
    n := next_task_number(code);
    update backlog_cards
       set task_number = n, protocol_code = code || lpad(n::text, 4, '0')
     where id = r.id;
  end loop;
end $$;

alter table backlog_cards
  add constraint backlog_cards_protocol_format check (protocol_code ~ '^[0-9]{8}$');
alter table backlog_cards
  add constraint backlog_cards_protocol_unique unique (protocol_code);
alter table backlog_cards alter column protocol_code set not null;
alter table backlog_cards alter column task_number set not null;

drop trigger if exists backlog_cards_assign_protocol on backlog_cards;
create trigger backlog_cards_assign_protocol
  before insert or update of protocol_code, task_number on backlog_cards
  for each row execute function backlog_cards_assign_protocol();

-- ------------------------------------------------- troca de cliente do card

-- Decisão: o protocolo original fica. A troca só é registrada, então o prefixo
-- pode não bater com o cliente atual ("origem 0042"), mas nada é duplicado e
-- as notas já fechadas continuam apontando pro mesmo número.
create table if not exists backlog_card_protocol_history (
  id uuid primary key default gen_random_uuid(),
  -- Sem FK: o histórico fica mesmo se o card for apagado.
  card_id uuid not null,
  protocol_code text not null,
  from_client_id uuid,
  to_client_id uuid,
  changed_at timestamptz not null default now()
);
create index if not exists backlog_card_protocol_history_card_idx
  on backlog_card_protocol_history(card_id);
create index if not exists backlog_card_protocol_history_protocol_idx
  on backlog_card_protocol_history(protocol_code);
alter table backlog_card_protocol_history enable row level security;

create or replace function backlog_cards_log_client_change() returns trigger
language plpgsql as $$
begin
  insert into backlog_card_protocol_history
    (card_id, protocol_code, from_client_id, to_client_id)
  values (new.id, new.protocol_code, old.client_id, new.client_id);
  return new;
end $$;

drop trigger if exists backlog_cards_log_client_change on backlog_cards;
create trigger backlog_cards_log_client_change
  after update of client_id on backlog_cards
  for each row when (old.client_id is distinct from new.client_id)
  execute function backlog_cards_log_client_change();
