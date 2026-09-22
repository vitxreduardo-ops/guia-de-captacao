-- Painel "Referências de vídeo" no guia (mesma forma de Fotos e Cards) e
-- carrossel inteiro nas referências coladas por link.
--
-- gallery_urls guarda todas as imagens de um carrossel do Instagram, capa
-- inclusive; image_url continua sendo a capa (miniatura e PDF). Vazio quando
-- a referência é uma imagem só.

create table if not exists video_reference_items (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  position integer not null default 0,
  image_url text not null,
  source_url text,
  caption text not null default '',
  selected boolean not null default false,
  gallery_urls text[] not null default '{}'
);

create index if not exists video_reference_items_guide_id_idx
  on video_reference_items(guide_id);

alter table video_reference_items enable row level security;

alter table photo_items add column if not exists gallery_urls text[] not null default '{}';
alter table card_items add column if not exists gallery_urls text[] not null default '{}';
alter table visual_references add column if not exists gallery_urls text[] not null default '{}';
