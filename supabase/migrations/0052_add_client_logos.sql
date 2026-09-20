-- Migração: biblioteca de logos de clientes.
--
-- A seção "Quem já confia" era preenchida logo a logo, em cada proposta. Como
-- nem toda marca que já passou por aqui conversa com quem está pedindo o
-- orçamento, a escolha muda de proposta para proposta — mas o acervo é o
-- mesmo. Esta tabela é o acervo.
--
-- A proposta continua guardando nome e URL dentro da própria seção, e não uma
-- referência a esta tabela: uma proposta já enviada não pode mudar porque
-- alguém editou ou apagou um logo aqui depois.

create table if not exists client_logos (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  logo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_logos_name_idx on client_logos(lower(name));

alter table client_logos enable row level security;

-- Semeia o acervo com os logos que já estão em uso nas propostas, para a
-- biblioteca não nascer vazia tendo o material à mão.
insert into client_logos (name, logo_url)
select distinct on (logo->>'url')
  coalesce(logo->>'name', ''),
  logo->>'url'
from budgets b,
     jsonb_array_elements(b.sections) s,
     jsonb_array_elements(s->'data'->'logos') logo
where s->>'kind' = 'logos'
  and coalesce(logo->>'url', '') <> ''
  and not exists (
    select 1 from client_logos c where c.logo_url = logo->>'url'
  );
