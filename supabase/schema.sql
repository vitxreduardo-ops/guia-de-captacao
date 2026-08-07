-- Guia de Captação — schema do Supabase
-- Para um projeto NOVO: rode este arquivo inteiro no SQL Editor.
-- Se você já rodou uma versão anterior deste schema (sem a tabela "videos"),
-- rode em vez disso supabase/migrations/0002_add_videos.sql para preservar
-- os dados existentes.

create extension if not exists pgcrypto;

create table if not exists guides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default 'Novo guia',
  client_name text default '',
  shoot_date date,
  location text default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  position integer not null default 0,
  title text not null default ''
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  position integer not null default 0,
  title text not null default '',
  script text not null default '',
  recorded boolean not null default false
);

create table if not exists visual_references (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  scene_id uuid references scenes(id) on delete set null,
  image_url text not null,
  source_url text,
  caption text not null default '',
  position integer not null default 0
);

create table if not exists shot_list_items (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  position integer not null default 0,
  description text not null default '',
  shot_type text not null default '',
  duration text not null default '',
  notes text not null default ''
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  category text not null default 'equipamento' check (category in ('equipamento', 'locacao')),
  position integer not null default 0,
  label text not null default '',
  done boolean not null default false
);

create index if not exists videos_guide_id_idx on videos(guide_id);
create index if not exists scenes_video_id_idx on scenes(video_id);
create index if not exists visual_references_guide_id_idx on visual_references(guide_id);
create index if not exists shot_list_items_guide_id_idx on shot_list_items(guide_id);
create index if not exists checklist_items_guide_id_idx on checklist_items(guide_id);

-- Storage: crie manualmente um bucket público chamado "guide-references"
-- (Storage > New bucket > marque "Public bucket") para permitir upload
-- de imagens de referência visual.

-- Este projeto acessa o banco usando a service role key apenas em código
-- server-side (nunca exposta ao navegador), então RLS pode ficar habilitado
-- com as tabelas sem policies — a service role ignora RLS por padrão.
alter table guides enable row level security;
alter table videos enable row level security;
alter table scenes enable row level security;
alter table visual_references enable row level security;
alter table shot_list_items enable row level security;
alter table checklist_items enable row level security;
