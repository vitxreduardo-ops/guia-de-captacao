-- Horário de postagem, opcional. Serve pra vista "Hoje" do calendário, que
-- distribui os materiais numa régua de horas. Material sem horário continua
-- válido e aparece numa faixa "sem horário".

alter table backlog_cards
  add column if not exists post_time time;
