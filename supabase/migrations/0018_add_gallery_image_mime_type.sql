-- Guarda o tipo do arquivo sincronizado do Drive (imagem ou vídeo) e o
-- caminho da subpasta de origem, pra galeria conseguir renderizar cada item
-- do jeito certo (<img> vs <video>) e agrupado por subpasta do Drive.

alter table gallery_images add column if not exists mime_type text;
alter table gallery_images add column if not exists drive_relative_path text;
