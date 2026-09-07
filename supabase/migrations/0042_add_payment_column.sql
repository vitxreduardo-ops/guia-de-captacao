-- Entregar e receber são dois eventos: o vídeo sai, a nota é emitida, e o
-- pagamento cai depois. O quadro de entregas ganha uma coluna para essa espera.
--
-- A regra continua morando na coluna, como o `billable`: `billable` diz "entra
-- na nota do mês", `paid` diz "e o dinheiro já entrou". As duas colunas do fim
-- do fluxo são faturáveis; só a última é paga.

alter table backlog_columns
  add column if not exists paid boolean not null default false;

-- Quando e como o dinheiro entrou. Fica no card porque é a entrega que foi
-- paga, não o cliente nem o mês.
alter table backlog_cards
  add column if not exists paid_at date;
alter table backlog_cards
  add column if not exists payment_method text
    check (payment_method in ('pix', 'transferencia', 'boleto', 'dinheiro', 'cartao', 'outro'));

-- O snapshot da nota precisa lembrar o estado do pagamento no fechamento: sem
-- isso o histórico perde os subtotais de pago e a receber.
alter table monthly_invoice_items
  add column if not exists paid boolean not null default false;
alter table monthly_invoice_items
  add column if not exists paid_at date;
alter table monthly_invoice_items
  add column if not exists payment_method text;

-- "Entregue" passa a significar entregue E pago; a espera ganha lugar próprio
-- logo antes dela. Só mexe no quadro se a coluna ainda não existir, então
-- rodar de novo não duplica nem reposiciona nada.
update backlog_columns
set position = position + 1
where board = 'entregas'
  and position >= 3
  and not exists (
    select 1 from backlog_columns
    where board = 'entregas' and name = 'Aguardando pagamento'
  );

insert into backlog_columns (name, color, position, board, billable, paid)
select 'Aguardando pagamento', '#f59e0b', 3, 'entregas', true, false
where not exists (
  select 1 from backlog_columns
  where board = 'entregas' and name = 'Aguardando pagamento'
);

-- A coluna final do fluxo de entregas é a que representa dinheiro recebido.
update backlog_columns
set paid = true
where board = 'entregas'
  and billable
  and name = 'Entregue';
