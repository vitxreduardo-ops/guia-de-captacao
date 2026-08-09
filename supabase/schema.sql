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
  position integer not null default 0,
  selected boolean not null default false
);

create table if not exists photo_items (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default '',
  selected boolean not null default false
);

create table if not exists card_items (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default '',
  selected boolean not null default false
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
create index if not exists photo_items_guide_id_idx on photo_items(guide_id);
create index if not exists card_items_guide_id_idx on card_items(guide_id);
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
alter table photo_items enable row level security;
alter table card_items enable row level security;
alter table shot_list_items enable row level security;
alter table checklist_items enable row level security;

-- Orçamento — proposta comercial em landing page por cliente (ver
-- supabase/migrations/0008_add_budgets.sql). Sem bucket de Storage: o único
-- campo de mídia é um link de vídeo de fundo (mp4/YouTube/Vimeo colado como
-- texto), não upload de arquivo.

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default 'Novo orçamento',
  client_name text default '',
  client_whatsapp text default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  hero_eyebrow text not null default 'PROPOSTA CRIATIVA · 2026',
  hero_title1 text not null default '',
  hero_title2 text not null default '',
  hero_subtitle text not null default '',
  hero_cta text not null default 'Conhecer a proposta',
  hero_bg_video_url text not null default '',
  about_title text not null default '',
  about_text text not null default '',
  highlights_title text not null default 'O que você recebe',
  calc_meu_nivel text not null default 'intermediario' check (calc_meu_nivel in ('iniciante', 'intermediario', 'pro')),
  calc_nivel_cliente text not null default 'medio' check (calc_nivel_cliente in ('pequena', 'medio', 'grande')),
  calc_estrategia numeric(10,2) not null default 0,
  calc_videos numeric(10,2) not null default 0,
  calc_resultado numeric(10,2) not null default 0,
  calc_extras numeric(10,2) not null default 0,
  calc_margem_pct numeric(5,2) not null default 10,
  calc_tax_pct numeric(5,2) not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budget_highlights (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  position integer not null default 0,
  title text not null default ''
);

create table if not exists budget_packages (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  position integer not null default 0,
  name text not null default '',
  price numeric(10,2) not null default 0,
  tag text not null default '',
  features text not null default ''
);

create table if not exists budget_faq (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  position integer not null default 0,
  question text not null default '',
  answer text not null default ''
);

create index if not exists budget_highlights_budget_id_idx on budget_highlights(budget_id);
create index if not exists budget_packages_budget_id_idx on budget_packages(budget_id);
create index if not exists budget_faq_budget_id_idx on budget_faq(budget_id);

alter table budgets enable row level security;
alter table budget_highlights enable row level security;
alter table budget_packages enable row level security;
alter table budget_faq enable row level security;
