-- Tatu Agent, fase 3: memória curta da conversa, ações à espera de
-- confirmação e registro do que o agente mudou.
--
-- A memória não é fonte de dado: guarda só o texto trocado, pra a segunda
-- mensagem ("Editar o vídeo institucional") completar a primeira ("Cria uma
-- tarefa pra Foco"). Tudo que importa é relido do banco a cada pergunta.

-- ------------------------------------------------------------ conversa

-- Separada por pessoa, chat e tópico: duas pessoas no mesmo tópico não
-- herdam o contexto uma da outra. `thread_id` 0 = sem tópico (privado/Geral).
create table if not exists agent_conversations (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id) on delete cascade,
  chat_id bigint not null,
  thread_id integer not null default 0,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_conversations_lookup_idx
  on agent_conversations(user_id, chat_id, thread_id, created_at desc);
alter table agent_conversations enable row level security;

-- --------------------------------------------------- ações pendentes

create table if not exists telegram_pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- Quem pode apertar Confirmar: o id numérico de quem pediu, nunca o @.
  telegram_user_id bigint not null,
  chat_id bigint not null,
  thread_id integer,
  operation text not null,
  -- Já validados e resolvidos (ids, não nomes) no momento da prévia.
  params jsonb not null,
  summary text not null,
  status text not null default 'pending' check (status in (
    'pending', 'executing', 'done', 'failed', 'cancelled', 'expired'
  )),
  -- Mesma mensagem do Telegram + mesma operação = uma ação só.
  idempotency_key text not null unique,
  result text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finished_at timestamptz
);
create index if not exists telegram_pending_actions_user_idx
  on telegram_pending_actions(user_id, created_at desc);
alter table telegram_pending_actions enable row level security;

-- ------------------------------------------------------------ auditoria

create table if not exists agent_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete set null,
  source text not null default 'telegram',
  operation text not null,
  params jsonb not null default '{}'::jsonb,
  outcome text not null check (outcome in ('done', 'failed', 'cancelled', 'denied')),
  detail text not null default '',
  pending_action_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists agent_audit_log_user_idx on agent_audit_log(user_id, created_at desc);
alter table agent_audit_log enable row level security;
