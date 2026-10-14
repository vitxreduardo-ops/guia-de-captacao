-- Novos avisos da campainha (e do app do Mac): briefing que chega, pagamento
-- confirmado num card seu e ideia enviada pelo cliente no portal.

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (
  kind in (
    'card_assigned', 'todo_assigned', 'card_moved', 'card_approved',
    'briefing_new', 'card_paid', 'client_idea'
  )
);
