-- Integração OAuth com o Google Drive — permite sincronizar automaticamente
-- as fotos de uma pasta do Drive pra galeria de um cliente, sem precisar
-- colar link por link.

-- Guarda o refresh_token da conta Google conectada. É um "singleton": o app
-- inteiro usa uma única conta conectada (id fixo 'default'), não uma por
-- usuário do admin.
create table if not exists google_oauth_tokens (
  id text primary key default 'default',
  refresh_token text not null,
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table google_oauth_tokens enable row level security;

alter table gallery_clients add column if not exists drive_folder_id text;
alter table gallery_clients add column if not exists drive_synced_at timestamptz;

alter table gallery_images add column if not exists drive_file_id text;

create unique index if not exists gallery_images_drive_file_id_idx
  on gallery_images(client_id, drive_file_id)
  where drive_file_id is not null;
