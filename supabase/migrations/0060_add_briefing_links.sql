-- Briefing por cliente: um link com o que a gente já sabe.
--
-- Hoje o link é um só (/briefing), igual pra todo mundo, e o cliente começa
-- digitando o nome e escolhendo o serviço — dados que a gente já tem anotados
-- no funil antes de mandar o link. Além de trabalho repetido pra ele, isso
-- deixa a resposta solta: chega um briefing de "Padaria" e ninguém sabe se é
-- o contato que está em negociação ou alguém que achou o link por aí.
--
-- Cada convite é uma linha aqui, com slug próprio. O que estiver preenchido
-- entra no formulário como resposta inicial — e continua editável, porque o
-- cliente é quem sabe o nome da própria empresa.

create table if not exists briefing_links (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,

  -- De onde veio. `set null` pra que apagar o contato não leve o briefing
  -- respondido junto.
  prospect_id uuid references prospects(id) on delete set null,

  -- O que já se sabe. Tudo opcional: um link sem nada é o link genérico de
  -- hoje, e continua válido.
  client_name text not null default '',
  contact text not null default '',
  servico text not null default '',

  -- Recado que aparece no alto do formulário, no lugar da abertura padrão.
  note text not null default '',

  -- Aberto é diferente de respondido: o primeiro diz que o link chegou, o
  -- segundo que valeu. Sem os dois não dá pra saber se o silêncio é do
  -- cliente ou do WhatsApp que não entregou.
  opened_at timestamptz,
  answered_at timestamptz,

  created_at timestamptz not null default now()
);

alter table briefing_links enable row level security;

-- A resposta aponta pro convite. Fica em `briefings` e não numa tabela de
-- ligação porque é um pra um: um convite respondido gera um briefing.
alter table briefings
  add column if not exists link_id uuid
    references briefing_links(id) on delete set null;

create index if not exists briefing_links_created_idx
  on briefing_links(created_at desc);
