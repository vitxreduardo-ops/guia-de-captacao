-- Biblioteca ganha categorização e identidade visual.
--
-- Antes um link só tinha título, URL e descrição, o que deixava a listagem
-- como um bloco único de texto: sem como agrupar por assunto nem como
-- reconhecer o site de relance. `tags` traz a mesma categorização livre que os
-- guias já usam (ver 0011_add_guide_tags.sql) e alimenta a busca da página.
--
-- `icon_url` é opcional e serve só de override: quando está vazio, a interface
-- deriva o favicon a partir do domínio do próprio link. Preencher só faz
-- sentido quando o favicon do site é ruim ou não existe.

alter table library_links
  add column if not exists tags text[] not null default '{}'::text[];

alter table library_links
  add column if not exists icon_url text not null default '';

create index if not exists library_links_tags_idx on library_links using gin (tags);
