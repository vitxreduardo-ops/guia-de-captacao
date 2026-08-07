-- Adiciona a coluna "recorded" em scenes, usada pelo checklist de cena
-- gravada na página pública do guia.
alter table scenes add column if not exists recorded boolean not null default false;
