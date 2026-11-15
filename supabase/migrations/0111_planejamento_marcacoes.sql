-- O que o cliente marcou em cada entrega do planejamento ("Gravei", "Postei").
-- Uma linha por passo feito; desmarcar apaga a linha. entrega_id é o id
-- estável da entrega dentro do content ("e0", "e1"…), passo é "g" ou "p".
create table if not exists planejamento_marcacoes (
  planejamento_id uuid not null references planejamentos(id) on delete cascade,
  entrega_id text not null,
  passo text not null check (passo in ('g', 'p')),
  created_at timestamptz not null default now(),
  primary key (planejamento_id, entrega_id, passo)
);

alter table planejamento_marcacoes enable row level security;
