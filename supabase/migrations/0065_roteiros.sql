-- Gerador de roteiros (/admin/roteiros), trazido do app separado roteiro-app.
-- Mesma tabela de lá; sem policies "anon" porque aqui o acesso é só pelo
-- servidor com a service role, como no resto do Guia.

create table if not exists roteiros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  framework text not null,
  tema text not null,
  objetivo text not null,
  duracao_segundos integer not null,
  tom text,
  nicho text,
  roteiro jsonb not null,
  favorito boolean not null default false,
  status text not null default 'novo' check (status in ('novo', 'usado', 'descartado')),
  tags text[] not null default '{}'
);

create index if not exists roteiros_created_at_idx on roteiros (created_at desc);
create index if not exists roteiros_tags_idx on roteiros using gin (tags);

alter table roteiros enable row level security;
