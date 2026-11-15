-- Planejamento mensal do cliente: 5 páginas fixas (estratégia, rotina,
-- calendário, roteiros, referências). O conteúdo é um jsonb lido e gravado por
-- inteiro; a IA preenche os campos a partir do material colado pela equipe.
create table if not exists planejamentos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references gallery_clients(id) on delete cascade,
  slug text not null unique,
  title text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planejamentos_client_idx on planejamentos (client_id, created_at desc);

alter table planejamentos enable row level security;
