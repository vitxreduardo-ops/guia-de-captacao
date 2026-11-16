-- Fundação do Telegram (Tatu Agent, fase 2): quem é quem, o que já foi
-- processado e quais tópicos do grupo TATU | HUB servem pra quê.
--
-- A identidade é o id numérico do Telegram (`from.id`), nunca o @username:
-- o username muda e pode ser reaproveitado por outra pessoa.

-- --------------------------------------------------------------- identidades

create table if not exists telegram_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  telegram_user_id bigint not null,
  -- Só pra exibir; nunca usado pra autorizar.
  telegram_username text not null default '',
  linked_at timestamptz not null default now(),
  active boolean not null default true
);

-- Um Telegram ativo por pessoa e uma pessoa por Telegram. Desvincular
-- desliga `active` em vez de apagar: a auditoria das fases seguintes aponta
-- pra esta linha.
create unique index if not exists telegram_identities_tg_active_idx
  on telegram_identities(telegram_user_id) where active;
create unique index if not exists telegram_identities_user_active_idx
  on telegram_identities(user_id) where active;

alter table telegram_identities enable row level security;

-- Código de vinculação: gerado no painel por quem está logado e consumido
-- pelo bot. Guarda só o hash; o código em si vive no link do Telegram.
create table if not exists telegram_link_tokens (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists telegram_link_tokens_user_idx on telegram_link_tokens(user_id);
alter table telegram_link_tokens enable row level security;

-- ----------------------------------------------------------- idempotência

-- O Telegram reenvia o update se a resposta demorar ou falhar. A chave
-- primária faz o segundo insert falhar, e quem perdeu a corrida não processa.
create table if not exists telegram_processed_updates (
  update_id bigint primary key,
  received_at timestamptz not null default now()
);
alter table telegram_processed_updates enable row level security;

-- ------------------------------------------------------- tópicos do grupo

-- Cada tópico do supergrupo é um `message_thread_id`. O mapa diz qual papel
-- ele tem; o agente usa isso como contexto de conversa.
create table if not exists telegram_topic_routes (
  chat_id bigint not null,
  thread_id integer not null,
  topic text not null check (topic in (
    'comando', 'referencias', 'ordens', 'agenda',
    'relatorios', 'clientes', 'notificacoes'
  )),
  created_at timestamptz not null default now(),
  primary key (chat_id, thread_id),
  unique (chat_id, topic)
);
alter table telegram_topic_routes enable row level security;
