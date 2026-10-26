-- Formato "Card": arte estática da agência, uma ou várias lâminas. Antes
-- esses cards ficavam como Reel (o padrão) e o portal mostrava errado.
alter table backlog_cards drop constraint if exists backlog_cards_format_check;
alter table backlog_cards
  add constraint backlog_cards_format_check
    check (format in ('reel', 'carrossel', 'foto', 'story', 'card'));
