-- Arquivos que o cliente vê na prévia do material para aprovação: ids de
-- `gallery_images` (a galeria do cliente, sincronizada com o Drive). Sem FK
-- porque é um array; ids que sumirem da galeria simplesmente não aparecem.

alter table backlog_cards
  add column if not exists media_image_ids uuid[] not null default '{}';
