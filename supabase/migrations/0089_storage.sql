-- Armazenamento: onde o material do estúdio mora (SSDs, nuvem) e o que existe
-- em cada lugar. Tamanhos em GB. `used_gb` é lançado à mão por enquanto.
create table if not exists storage_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'estudio' check (role in ('estudio', 'backup', 'entrega')),
  capacity_gb numeric not null check (capacity_gb > 0),
  used_gb numeric not null default 0 check (used_gb >= 0),
  limit_percent integer not null default 80 check (limit_percent between 1 and 100),
  -- Preenchidos pelo app do Mac, que lê os discos sozinho. `device_key` nulo = espaço manual.
  device_key text unique,
  connected boolean not null default true,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Um material (pasta de projeto, cartão de câmera...) e os lugares onde há cópia.
create table if not exists storage_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size_gb numeric not null default 0 check (size_gb >= 0),
  location_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table storage_locations enable row level security;
alter table storage_items enable row level security;
