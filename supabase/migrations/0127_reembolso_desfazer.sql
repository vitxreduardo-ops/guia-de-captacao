-- "Reembolsei" precisa poder ser desfeito: cada saída avulsa quitada guarda
-- qual reembolso a quitou, para o desfazer devolver só o que ele quitou.
alter table expenses
  add column if not exists reimbursement_id uuid references expense_reimbursements(id) on delete set null;

-- Reembolsos que já existem: liga as saídas que foram quitadas junto com eles.
update expenses e
   set reimbursement_id = r.id
  from expense_reimbursements r
 where e.reimbursement_id is null
   and e.paid_by = r.person
   and e.paid_on = r.through
   and e.paid_marked_at between r.marked_at - interval '10 seconds' and r.marked_at + interval '10 seconds';

notify pgrst, 'reload schema';
