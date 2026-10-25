-- Plano do item que o cliente vê no portal (gancho, cenário, palavra-chave).
-- Separado de description, que é "Observações internas" e nunca sai do admin.
-- Uma linha por campo, no formato "Rótulo: valor"; o portal monta a lista.
alter table backlog_cards
  add column if not exists client_plan text not null default '';
