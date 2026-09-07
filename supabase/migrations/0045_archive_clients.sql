-- Cliente que não trabalha mais com a gente sai da frente sem levar junto o
-- histórico: as entregas, as notas fechadas e a galeria continuam lá.
--
-- Data em vez de booleano: saber *quando* o cliente saiu vale para entender um
-- ano em que ele aparece só até certo mês.
alter table gallery_clients
  add column if not exists archived_at timestamptz;
