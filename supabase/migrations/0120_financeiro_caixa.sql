-- Caixa, metas e contas a pagar do Financeiro.
--
-- finance_settings: uma linha só (id = true). Guarda o saldo conferido na
-- conta (e o dia da conferência: o que entra e sai depois dele o app soma
-- sozinho), a meta de faturamento do mês, a % da reserva estimada e a meta
-- de reserva em meses de custo.
create table if not exists finance_settings (
  id boolean primary key default true check (id),
  cash_cents bigint,
  cash_on date,
  -- Hora exata da conferência: o que for marcado depois dela soma sozinho,
  -- mesmo no mesmo dia.
  cash_at timestamptz,
  revenue_goal_cents bigint check (revenue_goal_cents is null or revenue_goal_cents >= 0),
  reserve_rate_bps integer not null default 600 check (reserve_rate_bps between 0 and 10000),
  reserve_goal_months numeric(3, 1) not null default 3 check (reserve_goal_months > 0)
);
insert into finance_settings (id) values (true) on conflict (id) do nothing;
alter table finance_settings enable row level security;

-- Saída agora pode ficar "a pagar": paid_on vazio = ainda não saiu do caixa,
-- e spent_on passa a ser o vencimento. As que já existiam saíram na própria
-- data, então ficam pagas.
alter table expenses add column if not exists paid_on date;
-- Hora em que alguém marcou "Paguei": desempata o que saiu no mesmo dia do saldo conferido.
alter table expenses add column if not exists paid_marked_at timestamptz;
update expenses set paid_on = spent_on where paid_on is null and spent_on <= current_date;

-- Gasto de um cliente específico (freela, locação, deslocamento): é o que
-- permite mostrar a margem por cliente na Análise. Vazio = custo do estúdio.
alter table expenses
  add column if not exists client_id uuid references gallery_clients(id) on delete set null;
create index if not exists expenses_client_idx on expenses (client_id) where client_id is not null;

-- Avisa o PostgREST (API do Supabase) para ler as tabelas e colunas novas.
notify pgrst, 'reload schema';
