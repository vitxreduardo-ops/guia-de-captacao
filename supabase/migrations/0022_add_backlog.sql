-- Backlog do Instagram — kanban de materiais da agência.
-- Colunas são editáveis pelo admin (não são um enum fixo), e cada card pode
-- ser marcado com um cliente já cadastrado em gallery_clients pra filtrar
-- depois. A mídia do card é só um link (Google Drive normalmente), não upload:
-- o arquivo continua morando no Drive.

create table if not exists backlog_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nova coluna',
  color text not null default '#6b7280',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists backlog_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references backlog_columns(id) on delete cascade,
  client_id uuid references gallery_clients(id) on delete set null,
  guide_id uuid references guides(id) on delete set null,
  position integer not null default 0,
  title text not null default '',
  description text not null default '',
  format text not null default 'reel'
    check (format in ('reel', 'carrossel', 'foto', 'story')),
  drive_url text,
  cover_url text,
  caption text not null default '',
  post_date date,
  sent_whatsapp boolean not null default false,
  sent_whatsapp_at timestamptz,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backlog_cards_column_id_idx on backlog_cards(column_id);
create index if not exists backlog_cards_client_id_idx on backlog_cards(client_id);
create index if not exists backlog_cards_post_date_idx on backlog_cards(post_date);
create index if not exists backlog_cards_tags_idx on backlog_cards using gin (tags);

alter table backlog_columns enable row level security;
alter table backlog_cards enable row level security;

-- Colunas iniciais. Só insere se o quadro estiver vazio, então rodar a
-- migration duas vezes não duplica nada.
insert into backlog_columns (name, color, position)
select * from (values
  ('Ideia', '#6b7280', 0),
  ('Captado', '#0ea5e9', 1),
  ('Editado', '#8b5cf6', 2),
  ('Aprovação', '#f59e0b', 3),
  ('Postado', '#10b981', 4)
) as seed(name, color, position)
where not exists (select 1 from backlog_columns);
