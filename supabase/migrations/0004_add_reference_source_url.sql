-- Migração: adiciona "source_url" em visual_references.
-- Guarda o link original (ex: post do Instagram/Pinterest) quando a imagem
-- exibida foi extraída automaticamente da capa (og:image) daquele link.
-- Idempotente e segura de rodar em qualquer estado do banco.

alter table visual_references add column if not exists source_url text;
