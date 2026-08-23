-- Sincronização do calendário do backlog com o Google Agenda.
--
-- Reaproveita a conta Google já conectada pelo Drive (google_oauth_tokens):
-- o escopo do OAuth passou a pedir também acesso aos eventos do calendário,
-- então conectar de novo é o suficiente pra habilitar essa parte.

-- Calendário de destino escolhido pelo admin. Fica na mesma linha singleton
-- do token porque a conta conectada e o calendário de destino andam juntos:
-- desconectar a conta zera os dois.
alter table google_oauth_tokens
  add column if not exists calendar_id text;

-- Id do evento criado no Google pra este card. Guardar aqui é o que permite
-- atualizar/apagar o evento certo depois, em vez de criar um duplicado a
-- cada edição.
alter table backlog_cards
  add column if not exists google_event_id text;
