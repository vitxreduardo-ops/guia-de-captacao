-- Pagamento parcial de uma entrega: quanto já foi recebido (em centavos) enquanto
-- o card ainda está na coluna de espera. Nulo = nada recebido. Quando o total é
-- quitado o card vai pra coluna de pago e este campo volta a nulo.
alter table backlog_cards
  add column if not exists paid_cents integer check (paid_cents >= 0);
