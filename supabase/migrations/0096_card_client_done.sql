-- "Feito" marcado no calendário do portal, pelo cliente ou pela equipe na
-- prévia. Não mexe na coluna do card nem no ig_status (que é da publicação
-- automática): é só o registro de que o post saiu.
alter table backlog_cards
  add column if not exists client_done_at timestamptz;
