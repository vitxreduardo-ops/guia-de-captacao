-- Salvos do Instagram (/admin/referencias/salvos): as coleções de posts salvos
-- da conta da Tatu, catalogadas como referência. Escrito pelo script
-- scripts/sincronizar-salvos-instagram.mjs; a tela só lê e edita tags,
-- cliente e anotação (campos que a sincronização nunca sobrescreve).

create table if not exists instagram_saved_collections (
  key text primary key,
  name text not null,
  url text not null default '',
  position int not null default 0
);

create table if not exists instagram_saved_posts (
  collection_key text not null references instagram_saved_collections (key) on delete cascade,
  id text not null,
  type text not null default 'p' check (type in ('p', 'reel')),
  label text not null default '',
  -- Cópia no nosso bucket: a miniatura assinada do Instagram expira em dias.
  thumb_url text not null default '',
  note text not null default '',
  client text not null default '',
  tags text[] not null default '{}',
  added_on date,
  position int not null default 0,
  primary key (collection_key, id)
);

create index if not exists instagram_saved_posts_collection_idx
  on instagram_saved_posts (collection_key, position);

alter table instagram_saved_collections enable row level security;
alter table instagram_saved_posts enable row level security;
