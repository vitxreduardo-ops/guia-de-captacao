-- Início e fim do contrato do cliente recorrente: a projeção só prevê dentro dele.
alter table public.recurring_clients
  add column if not exists starts_on date not null default current_date,
  add column if not exists ends_on date;

alter table public.recurring_clients
  add constraint recurring_clients_periodo check (ends_on is null or ends_on >= starts_on);

notify pgrst, 'reload schema';
