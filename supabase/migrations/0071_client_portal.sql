-- Área do cliente: um usuário com role 'client' fica preso a um cliente
-- (`client_id`) e só enxerga o que é dele em /cliente. Aprovar usa as colunas
-- que o card já tem (approved_at/approved_by); "pedir ajuste" ganha a nota e a
-- data abaixo.

alter table users drop constraint if exists users_role_check;
alter table users
  add constraint users_role_check check (role in ('admin', 'member', 'client'));

alter table users
  add column if not exists client_id uuid references gallery_clients(id) on delete cascade;

alter table backlog_cards
  add column if not exists client_feedback text not null default '',
  add column if not exists changes_requested_at timestamptz;
