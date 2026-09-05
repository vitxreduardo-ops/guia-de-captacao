-- Onde o material bruto foi salvo. Já existia como pergunta automática
-- (registrada só como nota no histórico) — vira também um campo fixo no
-- card, editável junto com responsável/horário.

alter table backlog_cards
  add column if not exists backup_location text;
