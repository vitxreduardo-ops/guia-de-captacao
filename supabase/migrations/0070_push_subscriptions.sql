-- Inscrições de Web Push: cada aparelho (iPhone com o app na Tela de Início,
-- navegador do computador) que aceitou receber notificações. Uma pessoa pode
-- ter várias; o endpoint é único porque identifica o aparelho no serviço de
-- push da Apple/Google/Mozilla.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
