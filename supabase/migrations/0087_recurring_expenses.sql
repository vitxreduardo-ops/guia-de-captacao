-- Despesas que se repetem todo mês (aluguel, assinaturas). Nada é copiado
-- mês a mês: a tela calcula cada mês a partir daqui. "Parar de repetir" só
-- preenche ends_on, e os meses anteriores continuam contando.
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null default '',
  amount_cents integer not null check (amount_cents > 0),
  category text not null default 'outros'
    check (category in ('equipe', 'equipamento', 'software', 'impostos', 'transporte', 'marketing', 'outros')),
  day_of_month integer not null check (day_of_month between 1 and 31),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  created_by uuid references users(id) on delete set null
);

alter table recurring_expenses enable row level security;
