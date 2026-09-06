-- Kanban de entregas por cliente + fechamento mensal.
--
-- Em vez de um quadro novo do zero, o backlog existente ganha um recorte:
-- cada coluna pertence a um `board`. O quadro do Instagram continua sendo o
-- 'instagram' e as entregas de cliente vivem no 'entregas', com as mesmas
-- telas, cards e checklist.
--
-- O valor da nota sai dos cards: cada entrega guarda o preço unitário no
-- momento em que foi lançada (não uma referência viva ao catálogo), pra que
-- mexer na tabela de preços depois não mude o que já foi cobrado.

alter table backlog_columns
  add column if not exists board text not null default 'instagram'
    check (board in ('instagram', 'entregas'));

-- Colunas marcadas como "entregue" são as que entram na nota do mês.
alter table backlog_columns
  add column if not exists billable boolean not null default false;

create index if not exists backlog_columns_board_idx on backlog_columns(board);

-- Catálogo de produtos e serviços. `price_cents` é só o valor sugerido: o
-- card copia o preço na hora do lançamento e pode ser ajustado item a item.
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Novo serviço',
  price_cents integer not null default 0 check (price_cents >= 0),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table services enable row level security;

alter table backlog_cards
  add column if not exists service_id uuid references services(id) on delete set null;
alter table backlog_cards
  add column if not exists quantity integer not null default 1 check (quantity > 0);
alter table backlog_cards
  add column if not exists unit_price_cents integer check (unit_price_cents >= 0);

-- Fechamento do mês: uma vez fechado, o total não acompanha mais mudanças no
-- quadro. Os itens são cópias, não referências — se o card for editado ou
-- excluído depois, a nota já emitida continua batendo.
create table if not exists monthly_invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references gallery_clients(id) on delete cascade,
  -- Primeiro dia do mês de competência.
  month date not null,
  total_cents integer not null default 0 check (total_cents >= 0),
  notes text not null default '',
  closed_at timestamptz not null default now(),
  closed_by uuid references users(id) on delete set null,
  unique (client_id, month)
);

create table if not exists monthly_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references monthly_invoices(id) on delete cascade,
  -- Só pra rastrear a origem; a nota não depende do card continuar existindo.
  card_id uuid references backlog_cards(id) on delete set null,
  description text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  position integer not null default 0
);

create index if not exists monthly_invoices_client_id_idx on monthly_invoices(client_id);
create index if not exists monthly_invoice_items_invoice_id_idx
  on monthly_invoice_items(invoice_id);

alter table monthly_invoices enable row level security;
alter table monthly_invoice_items enable row level security;

-- Colunas iniciais do quadro de entregas. Só cria se ainda não existir
-- nenhuma, então rodar de novo não duplica.
insert into backlog_columns (name, color, position, board, billable)
select * from (values
  ('Briefado', '#6b7280', 0, 'entregas', false),
  ('Em produção', '#0ea5e9', 1, 'entregas', false),
  ('Em edição', '#8b5cf6', 2, 'entregas', false),
  ('Entregue', '#10b981', 3, 'entregas', true)
) as seed(name, color, position, board, billable)
where not exists (select 1 from backlog_columns where board = 'entregas');
