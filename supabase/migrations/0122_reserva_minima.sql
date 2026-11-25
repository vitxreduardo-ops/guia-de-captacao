-- Reserva mínima em caixa: o piso que o caixa não pode furar.
--
-- reserve_min_cents: valor fixo em reais (ex.: R$ 5.000).
-- reserve_min_months: meses de custo (custo mensal médio x meses).
-- Preenchendo os dois, vale o maior. Os dois vazios = 1 mês de custo, como era.
-- A coluna reserve_goal_months (meta em meses, 0120) deixa de ser usada.
alter table finance_settings
  add column if not exists reserve_min_cents bigint check (reserve_min_cents is null or reserve_min_cents >= 0),
  add column if not exists reserve_min_months numeric(3, 1) check (reserve_min_months is null or reserve_min_months > 0);

notify pgrst, 'reload schema';
