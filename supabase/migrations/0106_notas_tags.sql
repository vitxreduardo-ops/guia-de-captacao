-- Notas: tags nas páginas (mesmo formato de library_links.tags).
alter table notion_pages add column if not exists tags text[] not null default '{}';
create index if not exists notion_pages_tags_idx on notion_pages using gin (tags);
