-- Peso e categoria são só rótulos de organização: a fonte continua sendo um
-- arquivo por cadastro. O peso entra no `family` (ver letteringLibrary), então
-- Regular e Bold do mesmo rótulo são duas famílias e não se sobrescrevem.
alter table lettering_fonts
  add column if not exists weight text not null default '',
  add column if not exists category text not null default '';

alter table lettering_fonts
  drop constraint if exists lettering_fonts_category_check;

alter table lettering_fonts
  add constraint lettering_fonts_category_check
  check (category in ('', 'sans', 'serif', 'slab', 'script', 'display', 'mono'));
