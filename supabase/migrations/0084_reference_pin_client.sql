-- Pra quem a referência foi guardada: nome do cliente, texto livre.
-- Vazio = referência geral, sem cliente em mente.
alter table reference_pins
  add column if not exists client text not null default '';
