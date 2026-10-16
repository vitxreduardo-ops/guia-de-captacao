-- Vencimento próprio de uma entrega (AAAA-MM-DD). Nulo = automático: o dia de
-- pagamento do cliente, no mês seguinte ao do trabalho. Preenchido, manda no
-- lugar da regra — pra quando o combinado muda de um trabalho pro outro.
alter table backlog_cards
  add column if not exists due_on date;
