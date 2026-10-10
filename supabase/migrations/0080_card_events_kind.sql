-- Um card do quadro de entregas tem dois compromissos na agenda (captação e
-- entrega), então o evento do Google passa a ser identificado também pelo
-- tipo. Os já existentes são de entrega.

alter table backlog_card_events
  add column if not exists kind text not null default 'entrega'
    check (kind in ('entrega', 'captacao'));

alter table backlog_card_events drop constraint if exists backlog_card_events_pkey;
alter table backlog_card_events add primary key (card_id, user_id, kind);
