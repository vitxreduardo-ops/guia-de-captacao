-- Aprovação do material: marcada no próprio card enquanto ele está na coluna
-- de aprovação. Só registra o "feito" — mover pra Postado continua manual.

alter table backlog_cards
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references users(id) on delete set null;
