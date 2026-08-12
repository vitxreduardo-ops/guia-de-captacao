-- Guarda a data real de modificação do arquivo no Drive (não a data em que
-- foi sincronizado pro nosso banco) — usada pela ordenação "por data" na
-- galeria pública.

alter table gallery_images add column if not exists drive_modified_time timestamptz;
