-- Prospecção: funil de relacionamento com fila, ficha e tabela.
--
-- Tabelas próprias em vez de reaproveitar `backlog_cards`. O kanban foi
-- descartado como formato, e era ele a única razão pra reusar o card: sem a
-- tela compartilhada sobrariam só os campos que não servem (formato de post,
-- link do Drive, legenda, serviço, preço) e um check de `format` que contato
-- nenhum satisfaz.
--
-- O que este funil deliberadamente não tem: pontuação, temperatura,
-- probabilidade de fechamento. O sistema lembra, não julga — num estúdio a
-- relação é o produto, e nota em cima de gente muda o jeito de tratar.

-- ---------------------------------------------------------------- etapas

-- Editáveis pelo usuário (nome, cor, ordem, roteiro), mas cada uma declara um
-- `kind` fixo. É o que permite renomear "Perdido" para "Não rolou" sem o app
-- perder a noção de que ali se pergunta o motivo.
create table if not exists prospect_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nova etapa',
  color text not null default '#6b7280',
  position integer not null default 0,
  kind text not null default 'ativa'
    check (kind in ('ativa', 'ganha', 'perdida', 'nutricao')),
  -- Roteiro da etapa: o que se diz depende de onde o contato está, e é o
  -- mesmo texto para todo mundo que passa por ali. Markdown solto.
  playbook text not null default '',
  created_at timestamptz not null default now()
);

alter table prospect_stages enable row level security;

-- ---------------------------------------------------------------- contatos

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Novo contato',
  -- Vira cliente quando fecha; até lá fica nulo. O vínculo é o que permite
  -- responder "de onde vieram os clientes que temos".
  client_id uuid references gallery_clients(id) on delete set null,
  stage_id uuid not null references prospect_stages(id) on delete restrict,
  owner_id uuid references users(id) on delete set null,

  contact_name text not null default '',
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  handle text not null default '',

  -- Origem como texto livre, igual às tags da Biblioteca (0036) e dos guias
  -- (0011): a categorização muda mais do que compensa manter cadastro.
  origin text not null default '',

  -- Próximo contato no mesmo molde de `backlog_cards.post_date/post_time`:
  -- data sem hora vira evento de dia inteiro no Google Agenda, com hora usa a
  -- duração (padrão de 30 min quando nula).
  next_contact_date date,
  next_contact_time time,
  next_contact_minutes integer check (next_contact_minutes > 0),
  next_contact_what text not null default '',

  -- Sem motivo, a etapa de perda não ensina nada: seis meses depois são vinte
  -- contatos arquivados e nenhuma resposta pra "por que não fecha".
  lost_reason text not null default '',
  notes text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table prospects enable row level security;

-- A fila de "hoje" ordena por isso e é a tela inicial: sem índice, toda
-- abertura varre a tabela.
create index if not exists prospects_next_contact_idx
  on prospects(next_contact_date, next_contact_time);
create index if not exists prospects_stage_idx on prospects(stage_id);

-- ------------------------------------------------------------- histórico

-- Uma linha por coisa que aconteceu. `happened_at` é separado de `created_at`
-- porque a conversa de ontem costuma ser registrada hoje.
create table if not exists prospect_touches (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  kind text not null default 'contato'
    check (kind in ('contato', 'nota', 'etapa')),
  message text not null default '',
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table prospect_touches enable row level security;

create index if not exists prospect_touches_prospect_idx
  on prospect_touches(prospect_id, happened_at desc);

-- ----------------------------------------------------------- eventos Google

-- Mesmo desenho de `backlog_card_events` (0034/0035): o evento é por pessoa,
-- porque cada um conecta a própria agenda e o id do Google só vale lá dentro.
create table if not exists prospect_events (
  prospect_id uuid not null references prospects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  google_event_id text not null,
  primary key (prospect_id, user_id)
);

alter table prospect_events enable row level security;

-- ------------------------------------------------------------------ seed

-- "Nutrição" é a etapa que costuma faltar e a que faz disto um funil de
-- relacionamento e não de venda: sem ela o "não agora" vira fim de linha em
-- vez de voltar numa data.
insert into prospect_stages (name, color, position, kind)
select * from (values
  ('Radar',             '#6b7280', 0, 'ativa'),
  ('Primeiro contato',  '#3b82f6', 1, 'ativa'),
  ('Conversa marcada',  '#8b5cf6', 2, 'ativa'),
  ('Diagnóstico',       '#06b6d4', 3, 'ativa'),
  ('Proposta enviada',  '#f59e0b', 4, 'ativa'),
  ('Negociação',        '#ec4899', 5, 'ativa'),
  ('Fechado',           '#10b981', 6, 'ganha'),
  ('Perdido',           '#ef4444', 7, 'perdida'),
  ('Nutrição',          '#a855f7', 8, 'nutricao')
) as seed(name, color, position, kind)
where not exists (select 1 from prospect_stages);
