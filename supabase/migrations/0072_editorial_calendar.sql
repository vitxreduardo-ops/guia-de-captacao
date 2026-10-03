-- Calendário editorial anual: ideias de conteúdo por mês, por cliente, que o
-- cliente vê no portal (a menos que marcadas como "só equipe"). `gallery_article`
-- guarda o "do/da" do título "Galeria do 14Bis" / "Galeria da Dra. Juliana".

alter table gallery_clients
  add column if not exists gallery_article text not null default 'do'
    check (gallery_article in ('do', 'da'));

create table if not exists editorial_ideas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references gallery_clients(id) on delete cascade,
  month date not null,
  title text not null,
  notes text not null default '',
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists editorial_ideas_client_month_idx
  on editorial_ideas(client_id, month);

alter table editorial_ideas enable row level security;
