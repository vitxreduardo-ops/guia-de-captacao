-- Galeria do cliente — cada cliente tem sua própria aba no admin e seu
-- próprio link público (/galeria/[slug]) com as fotos dele.

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
