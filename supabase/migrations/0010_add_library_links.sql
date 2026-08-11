-- Migração: adiciona a ferramenta "Biblioteca" — uma lista simples de links e
-- ferramentas úteis (título, url, breve descrição) para todo mundo que acessa
-- o hub. Sem sub-tabelas, só uma tabela flat ordenável por data de criação.

create table if not exists library_links (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  url text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table library_links enable row level security;
