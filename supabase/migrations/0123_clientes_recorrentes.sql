-- Clientes recorrentes da Projeção: quem paga todo mês e quanto.
--
-- A projeção do caixa só enxergava cobranças já lançadas. Aqui a pessoa diz
-- quais clientes são recorrentes, o valor mensal e o dia em que o dinheiro
-- cai; a projeção completa os meses sem cobrança lançada com esse valor.
-- Não é cobrança: nada daqui aparece no A receber nem na cobrança do cliente.
create table if not exists recurring_clients (
  client_id uuid primary key references gallery_clients(id) on delete cascade,
  cents bigint not null check (cents > 0),
  pay_day smallint not null check (pay_day between 1 and 31),
  created_at timestamptz not null default now()
);
alter table recurring_clients enable row level security;

notify pgrst, 'reload schema';
