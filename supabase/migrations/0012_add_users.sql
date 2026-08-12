-- Migração: adiciona cadastro de usuários de verdade (email + senha própria),
-- substituindo a senha única compartilhada. Role 'admin' pode gerenciar
-- usuários; role 'member' tem acesso igual ao admin em guias, orçamentos e
-- biblioteca, mas não gerencia acesso.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table users enable row level security;
