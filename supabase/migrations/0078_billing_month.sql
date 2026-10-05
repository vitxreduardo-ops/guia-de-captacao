-- Mês de cobrança do card: material entregue num mês e cobrado no seguinte
-- (cliente com material antecipado e pagamento proporcional). Dia 1 do mês;
-- nulo = vale o mês da data do card, como sempre foi.

alter table backlog_cards
  add column if not exists billing_month date;
