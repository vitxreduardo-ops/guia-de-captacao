-- Data e horário da captação (início do projeto), opcionais. Existem ao lado
-- da data de entrega (`post_date`/`post_time`) no quadro de entregas: o card
-- passa a mostrar quando o trabalho começou e quando termina.

alter table backlog_cards
  add column if not exists capture_date date;
alter table backlog_cards
  add column if not exists capture_time time;
