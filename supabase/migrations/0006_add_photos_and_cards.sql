-- Adiciona os painéis "Fotos" e "Cards" (listas de imagens embedadas no
-- nível do guia, fora da estrutura de vídeos/cenas). Cada painel só aparece
-- no admin/página pública/PDF quando tem pelo menos um item.

create table if not exists photo_items (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default ''
);

create table if not exists card_items (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default ''
);

create index if not exists photo_items_guide_id_idx on photo_items(guide_id);
create index if not exists card_items_guide_id_idx on card_items(guide_id);

alter table photo_items enable row level security;
alter table card_items enable row level security;
