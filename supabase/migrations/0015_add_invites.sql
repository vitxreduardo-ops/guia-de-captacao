-- Migração: convites de cadastro — admin gera um link com token único e
-- uma role definida; a pessoa convidada acessa o link (página pública,
-- fora de /admin) e escolhe seus próprios usuário/e-mail/senha. O convite
-- vira inválido depois de usado.

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
