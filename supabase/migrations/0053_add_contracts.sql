-- Contratos: o documento que o cliente lê e aceita por link, no mesmo molde do
-- orçamento (0008) — rascunho no admin, `slug` público, uma página por cliente.
--
-- Tabela única e plana, sem tabelas filhas. O corpo do contrato é um texto só
-- (`body`, Markdown) com variáveis `{{cliente}}`, `{{valor}}`, `{{prazo}}`
-- trocadas na hora de exibir: cláusula é texto corrido que se lê inteiro, não
-- lista ordenável, e quebrar em linhas só serviria a uma reordenação que
-- ninguém pediu.
--
-- O aceite mora aqui e não num PDF assinado porque é o que o link acrescenta:
-- quem aceitou, com que nome e documento, em que instante. Não é assinatura
-- com validade de ICP-Brasil — é registro de aceite eletrônico, que é o que
-- um estúdio usa no dia a dia.

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default 'Novo contrato',

  -- Mesmos dois tipos que `backlog_cards.contract_type` (0043) já usa, pra
  -- que "contrato mensal" signifique a mesma coisa nas duas telas.
  kind text not null default 'mensal' check (kind in ('mensal', 'freela')),

  -- Modelo de partida. Não aparece na lista de contratos nem tem página
  -- pública: serve só pra nascer um contrato já escrito.
  is_template boolean not null default false,

  status text not null default 'draft'
    check (status in ('draft', 'published', 'signed')),

  -- Quem contrata. Documento e endereço são o que falta num orçamento e o que
  -- um contrato exige pra identificar a parte.
  client_name text not null default '',
  client_document text not null default '',
  client_email text not null default '',
  client_address text not null default '',

  -- O que muda de contrato pra contrato e é citado no corpo pelas variáveis.
  scope text not null default '',
  price numeric(10,2) not null default 0,
  payment_terms text not null default '',
  start_date date,
  duration_months integer check (duration_months > 0),

  body text not null default '',

  -- Aceite. Nulo até o cliente clicar; `signed_at` é o que distingue lido de
  -- aceito, e o IP é o único traço de origem que a página consegue registrar.
  signed_name text not null default '',
  signed_document text not null default '',
  signed_at timestamptz,
  signed_ip text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contracts enable row level security;

-- A lista do admin ordena por isso e os modelos são filtrados fora dela.
create index if not exists contracts_created_idx
  on contracts(is_template, created_at desc);
