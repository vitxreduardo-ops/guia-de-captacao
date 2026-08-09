-- Migração: adiciona a ferramenta "Orçamento" (proposta comercial em landing page
-- por cliente), portada da ferramenta estática "Roteiro" para o modelo de dados
-- deste app — tabela `budgets` com os campos flat da proposta (hero, sobre, tema,
-- calculadora recorrente) + três tabelas filhas ordenáveis (destaques, pacotes,
-- perguntas frequentes), mesmo padrão de guides/videos/scenes.

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
