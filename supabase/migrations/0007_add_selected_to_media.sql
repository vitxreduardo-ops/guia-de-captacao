-- Adiciona a coluna "selected" em visual_references, photo_items e
-- card_items — usada pelo check verde (imagem em P&B a 40%) na miniatura
-- da galeria de fotos, marcável de dentro do visualizador (lightbox).

alter table visual_references add column if not exists selected boolean not null default false;
alter table photo_items add column if not exists selected boolean not null default false;
alter table card_items add column if not exists selected boolean not null default false;
