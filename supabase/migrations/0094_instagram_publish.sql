-- Agendamento de posts no Instagram dos clientes via Instagram Login.
-- Uma conta por cliente (gallery_clients); o token longo dura 60 dias e é
-- renovado pelo cron em /api/cron/instagram.
create table if not exists instagram_accounts (
  client_id uuid primary key references gallery_clients(id) on delete cascade,
  ig_user_id text not null,
  username text not null default '',
  access_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table instagram_accounts enable row level security;

-- Estado de publicação no card (só quadro de entregas, posts de clientes).
-- ig_publish_at é próprio: post_date ali é a data da entrega, não do post.
-- Sem retry automático: falha vira 'falhou' pra um
-- humano decidir, senão um erro depois do publish duplica o post.
alter table backlog_cards
  add column if not exists ig_status text
    check (ig_status in ('agendado', 'publicando', 'publicado', 'falhou')),
  add column if not exists ig_publish_at timestamptz,
  add column if not exists ig_media_urls text[] not null default '{}',
  add column if not exists ig_container_id text,
  add column if not exists ig_media_id text,
  add column if not exists ig_error text;

create index if not exists backlog_cards_ig_status_idx
  on backlog_cards(ig_status) where ig_status in ('agendado', 'publicando');
