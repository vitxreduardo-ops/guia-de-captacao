-- Reserva guardada: o que o estúdio já separou de fato.
--
-- reserve_base_cents: quanto já havia na reserva quando a pessoa informou
-- (o lápis da Análise).
-- reserve_deposits: um registro por mês em que a pessoa tocou em "Reserva
-- feita". Só conta na reserva guardada o mês marcado; o valor é o da reserva
-- estimada daquele mês no momento do toque.
alter table finance_settings
  add column if not exists reserve_base_cents bigint not null default 0 check (reserve_base_cents >= 0);

create table if not exists reserve_deposits (
  month date primary key,
  cents bigint not null check (cents >= 0),
  done_at timestamptz not null default now()
);
alter table reserve_deposits enable row level security;

notify pgrst, 'reload schema';
