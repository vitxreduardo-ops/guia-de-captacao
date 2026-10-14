-- Histórico de versões do contrato. O editor salva sozinho a cada pausa na
-- digitação, então um trecho apagado sem querer seria gravado por cima. O
-- gatilho guarda o texto de antes, no máximo uma vez a cada 2 minutos por
-- contrato, e fica de olho só no corpo e no título.

create table if not exists contract_revisions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table contract_revisions enable row level security;

create index if not exists contract_revisions_contract_idx
  on contract_revisions(contract_id, created_at desc);

create or replace function contract_keep_revision() returns trigger
language plpgsql as $$
begin
  if old.is_template or (old.body is not distinct from new.body) then
    return new;
  end if;

  if not exists (
    select 1 from contract_revisions
    where contract_id = old.id and created_at > now() - interval '2 minutes'
  ) then
    insert into contract_revisions (contract_id, title, body)
    values (old.id, old.title, old.body);

    -- Teto de 100 versões por contrato; as mais antigas saem.
    delete from contract_revisions
    where contract_id = old.id
      and id not in (
        select id from contract_revisions
        where contract_id = old.id
        order by created_at desc
        limit 100
      );
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_keep_revision on contracts;
create trigger contracts_keep_revision
  before update on contracts
  for each row execute function contract_keep_revision();
