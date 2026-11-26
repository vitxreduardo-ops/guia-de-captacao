-- Saída paga no cartão pessoal de alguém da equipe: é custo do estúdio, mas
-- só sai do caixa quando o estúdio reembolsa a pessoa. Enquanto isso fica com
-- paid_on vazio (a empresa deve) e aparece no bloco Reembolsos.
alter table public.expenses
  add column if not exists paid_by text check (paid_by in ('vitor', 'rebeca'));

create index if not exists expenses_paid_by_open_idx
  on public.expenses (paid_by) where paid_by is not null and paid_on is null;

notify pgrst, 'reload schema';
