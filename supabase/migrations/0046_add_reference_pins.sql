-- Migração: acervo de referências visuais indexado por nicho (/admin/referencias).
--
-- É um mural: cada linha é um link colado (post, vídeo, imagem) e o nicho é
-- tag livre, igual à Biblioteca (0036) e aos guias (0011) — sem tabela de
-- nichos, porque a categorização muda mais do que compensa manter cadastro.
--
-- Nada é hospedado aqui: `thumb_url` guarda a capa que o link já publica
-- (og:image ou thumbnail do YouTube), então a miniatura depende do site de
-- origem continuar servindo aquela imagem. Capas assinadas (Instagram,
-- Facebook) expiram; nesse caso o card cai no favicon do domínio e o campo
-- pode ser reapontado à mão pelo formulário.
--
-- `kind` é resolvido na gravação ('image' | 'video' | 'link') pra que a
-- listagem não precise inspecionar URL a cada render.

create table if not exists reference_pins (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  url text not null default '',
  thumb_url text not null default '',
  kind text not null default 'link',
  note text not null default '',
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists reference_pins_tags_idx on reference_pins using gin (tags);

alter table reference_pins enable row level security;
