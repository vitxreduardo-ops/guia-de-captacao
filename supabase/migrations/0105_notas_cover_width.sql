-- Notas: capa opcional da página (URL de imagem ou "cor:<nome>") e largura total.
alter table notion_pages add column if not exists cover text not null default '';
alter table notion_pages add column if not exists full_width boolean not null default false;
