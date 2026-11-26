-- Saída que se repete todo mês paga no cartão pessoal de alguém (ex.: Drive 2TB).
-- Em vez de debitar do caixa no dia, cada mês vira um reembolso a pagar àquela
-- pessoa. `expense_reimbursements` guarda cada "Reembolsei": ele quita as
-- parcelas vencidas até a data `through`.
alter table recurring_expenses
  add column if not exists paid_by text check (paid_by in ('vitor', 'rebeca'));

create table if not exists expense_reimbursements (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('vitor', 'rebeca')),
  through date not null,
  marked_at timestamptz not null default now()
);
alter table expense_reimbursements enable row level security;

notify pgrst, 'reload schema';
