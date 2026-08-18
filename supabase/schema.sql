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
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guides_tags_idx on guides using gin (tags);

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
  script text not null default '',
  description text not null default '',
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

create table if not exists budget_references (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default ''
);

create index if not exists budget_highlights_budget_id_idx on budget_highlights(budget_id);
create index if not exists budget_packages_budget_id_idx on budget_packages(budget_id);
create index if not exists budget_faq_budget_id_idx on budget_faq(budget_id);
create index if not exists budget_references_budget_id_idx on budget_references(budget_id);

alter table budgets enable row level security;
alter table budget_highlights enable row level security;
alter table budget_packages enable row level security;
alter table budget_faq enable row level security;
alter table budget_references enable row level security;

-- Biblioteca — lista simples de links e ferramentas úteis (ver
-- supabase/migrations/0010_add_library_links.sql).

create table if not exists library_links (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  url text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table library_links enable row level security;

-- Usuários — cadastro real (username + senha) substituindo a senha única
-- compartilhada (ver supabase/migrations/0012_add_users.sql,
-- 0013_rename_users_email_to_username.sql e 0014_add_users_email.sql).
-- `email` é só dado de contato — o login é sempre por `username`.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text not null default '',
  password_hash text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table users enable row level security;

-- Convites de cadastro — link com token único que deixa a pessoa convidada
-- escolher seus próprios usuário/e-mail/senha (ver
-- supabase/migrations/0015_add_invites.sql).

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid references users(id) on delete set null,
  used_by uuid references users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invites enable row level security;

-- Galeria do cliente — cada cliente tem sua própria aba no admin e seu
-- próprio link público (/galeria/[slug]) com as fotos dele (ver
-- supabase/migrations/0016_add_gallery_clients.sql).

create table if not exists gallery_clients (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null default 'Novo cliente',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gallery_images (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references gallery_clients(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default '',
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gallery_images_client_id_idx on gallery_images(client_id);

alter table gallery_clients enable row level security;
alter table gallery_images enable row level security;

-- Backlog do Instagram — kanban de materiais da agência, com calendário de
-- postagem (ver supabase/migrations/0022_add_backlog.sql). As colunas do
-- quadro são editáveis pelo admin e a mídia do card é link (Drive), não
-- upload.

create table if not exists backlog_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nova coluna',
  color text not null default '#6b7280',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists backlog_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references backlog_columns(id) on delete cascade,
  client_id uuid references gallery_clients(id) on delete set null,
  guide_id uuid references guides(id) on delete set null,
  assignee_id uuid references users(id) on delete set null,
  position integer not null default 0,
  title text not null default '',
  description text not null default '',
  format text not null default 'reel'
    check (format in ('reel', 'carrossel', 'foto', 'story')),
  drive_url text,
  cover_url text,
  caption text not null default '',
  post_date date,
  post_time time,
  duration_minutes integer,
  sent_whatsapp boolean not null default false,
  sent_whatsapp_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references users(id) on delete set null,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backlog_cards_column_id_idx on backlog_cards(column_id);
create index if not exists backlog_cards_client_id_idx on backlog_cards(client_id);
create index if not exists backlog_cards_assignee_id_idx on backlog_cards(assignee_id);
create index if not exists backlog_cards_post_date_idx on backlog_cards(post_date);
create index if not exists backlog_cards_tags_idx on backlog_cards using gin (tags);

alter table backlog_columns enable row level security;
alter table backlog_cards enable row level security;

-- Checklist por material do backlog (ver
-- supabase/migrations/0023_add_backlog_checklist.sql).

create table if not exists backlog_checklist_items (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references backlog_cards(id) on delete cascade,
  position integer not null default 0,
  label text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists backlog_checklist_items_card_id_idx
  on backlog_checklist_items(card_id);

alter table backlog_checklist_items enable row level security;

-- Atividade do material do backlog: movimentações, respostas de automação e
-- comentários (ver supabase/migrations/0025_add_backlog_activity.sql).

create table if not exists backlog_card_activity (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references backlog_cards(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  kind text not null default 'note' check (kind in ('move', 'answer', 'note')),
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists backlog_card_activity_card_id_idx
  on backlog_card_activity(card_id, created_at desc);

alter table backlog_card_activity enable row level security;
