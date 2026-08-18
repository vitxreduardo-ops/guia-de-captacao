-- Duração do material na agenda, em minutos. Usada pelas vistas de hora do
-- calendário, onde o card pode ser esticado pra ocupar mais de uma faixa.
-- Sem valor, o card ocupa uma hora.

alter table backlog_cards
  add column if not exists duration_minutes integer;
