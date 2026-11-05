-- Notion da Tatu: árvore de páginas. O conteúdo (blocos do editor) mora num
-- jsonb por página, lido e gravado por inteiro, igual ao mapa mental.
-- plain_text é o mesmo conteúdo em texto corrido, só pra busca.
-- Apagar uma página apaga a subárvore (cascade); a lixeira usa archived_at.
create table if not exists notion_pages (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references notion_pages(id) on delete cascade,
  title text not null default '',
  icon text not null default '',
  content jsonb not null default '[]'::jsonb,
  plain_text text not null default '',
  position integer not null default 0,
  favorite boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notion_pages_parent_idx on notion_pages (parent_id);

alter table notion_pages enable row level security;
