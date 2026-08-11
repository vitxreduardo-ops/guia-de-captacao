-- Migração: adiciona tags livres aos guias de gravação, para permitir
-- categorização (ex: etiquetar o cliente, o tipo de conteúdo, etc.) e
-- filtragem na listagem de guias.

alter table guides add column if not exists tags text[] not null default '{}'::text[];

create index if not exists guides_tags_idx on guides using gin (tags);
