-- Despesas do estúdio: o que saiu de dinheiro, pra mostrar Saiu e Sobrou no
-- painel de Clientes > Dinheiro. Valor em centavos inteiros, como no resto.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null default '',
  amount_cents integer not null check (amount_cents > 0),
  category text not null default 'outros'
    check (category in ('equipe', 'equipamento', 'software', 'impostos', 'transporte', 'marketing', 'outros')),
  spent_on date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references users(id) on delete set null
);

create index if not exists expenses_spent_on_idx on expenses (spent_on);

alter table expenses enable row level security;
