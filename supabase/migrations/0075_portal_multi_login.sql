-- Vários logins por cliente no portal (equipe da empresa, gestor de tráfego,
-- parceiros) e convite por link pra pessoa criar o próprio login.
-- `full_name` e `portal_label` identificam a pessoa ("Gestor de tráfego");
-- o convite do cliente guarda o cliente e a função de quem vai entrar.

alter table users
  add column if not exists full_name text not null default '',
  add column if not exists portal_label text not null default '';

alter table invites drop constraint if exists invites_role_check;
alter table invites
  add constraint invites_role_check check (role in ('admin', 'member', 'client'));

alter table invites
  add column if not exists client_id uuid references gallery_clients(id) on delete cascade,
  add column if not exists label text not null default '';
