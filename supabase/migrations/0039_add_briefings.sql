-- Briefings enviados pelo cliente em /briefing. Guardam só o que o cliente
-- escreveu; o aviso vai pro WhatsApp na hora do envio, a tabela é o registro
-- pra consultar depois. Vale por 30 dias — passou disso, some.

create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null default '',
  contact text not null default '',
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists briefings_created_idx
  on briefings(created_at desc);

alter table briefings enable row level security;
