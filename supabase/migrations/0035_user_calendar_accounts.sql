-- Agenda do backlog deixa de ser do estúdio e passa a ser de cada pessoa.
--
-- Antes, a conta Google era uma só (google_oauth_tokens, linha singleton) e
-- servia Drive e Agenda ao mesmo tempo: todo card ia parar no calendário de
-- quem tinha conectado, e desconectar pra mexer no Drive derrubava as duas
-- coisas. Agora o Drive continua sendo do estúdio naquela linha, e cada
-- usuário conecta a própria conta só pro calendário.

create table if not exists user_calendar_accounts (
  user_id uuid primary key references users(id) on delete cascade,
  refresh_token text not null,
  email text not null default '',
  -- 'primary' é o apelido que o Google dá pra agenda principal da conta
  -- autenticada. Guardar o apelido em vez do id resolvido faz a integração
  -- continuar certa se a pessoa trocar de agenda principal depois.
  calendar_id text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_calendar_accounts enable row level security;

-- Um card agora tem um evento por pessoa conectada, então o id do evento não
-- cabe mais numa coluna do card.
create table if not exists backlog_card_events (
  card_id uuid not null references backlog_cards(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  google_event_id text not null,
  created_at timestamptz not null default now(),
  primary key (card_id, user_id)
);

alter table backlog_card_events enable row level security;

create index if not exists backlog_card_events_user_id_idx
  on backlog_card_events(user_id);

-- backlog_cards.google_event_id (migration 0034) fica onde está por ora: os
-- eventos que ela aponta pertencem à conta singleton antiga e serão apagados
-- por lá. Removê-la é assunto de uma migration posterior, depois que a
-- transição estiver de pé em produção.
