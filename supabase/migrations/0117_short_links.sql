-- Encurtador de links: tatuestudio.com.br/<slug> redireciona pra `url`.
-- O slug fica na raiz do domínio, então `lib/shortLinkSlug.ts` barra os nomes
-- que já são rota do app.

create table if not exists short_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  url text not null check (url ~* '^https?://'),
  cliques integer not null default 0,
  created_at timestamptz not null default now()
);

alter table short_links enable row level security;

-- Uma ida só ao banco por clique: soma e devolve o destino de forma atômica.
create or replace function registrar_clique_link(p_slug text)
returns text
language sql
as $$
  update short_links set cliques = cliques + 1 where slug = p_slug returning url;
$$;
