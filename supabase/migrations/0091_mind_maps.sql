-- Mapa mental: a árvore inteira mora num jsonb (nós aninhados), porque o mapa
-- sempre é lido e gravado por inteiro. Publicado = tem link público /mapa/<slug>.
create table if not exists mind_maps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  root jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mind_maps enable row level security;
