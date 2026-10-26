-- Repertório (/admin/repertorio): hub de leitura com as notícias dos portais
-- que a equipe acompanha, separadas por tema. Serve pra repertório, não pra
-- funil: nada aqui cobra data nem etapa. Gerar roteiro a partir de uma
-- notícia é opcional e passa pelo gerador que já existe (/admin/roteiros).
--
-- Só título, resumo curto e link: a matéria inteira fica no site de origem.

create table if not exists repertorio_fontes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  feed_url text not null unique,
  -- Tema como texto livre com sugestões na tela, igual ao ramo do Radar
  -- (0050): cliente novo de outro setor é uma fonte nova, sem migração.
  tema text not null default 'Marketing',
  ativa boolean not null default true,
  -- Última coleta que deu certo. A que falhou só deixa a mensagem.
  ultima_coleta_em timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now()
);

create table if not exists repertorio_noticias (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid not null references repertorio_fontes (id) on delete cascade,
  -- Link sem utm: é o que impede a mesma matéria de entrar duas vezes.
  url text not null unique,
  titulo text not null,
  resumo text not null default '',
  -- Nulo quando o feed não traz data legível; a tela usa coletado_em.
  publicado_em timestamptz,
  coletado_em timestamptz not null default now(),
  guardada boolean not null default false,
  lida boolean not null default false
);

create index if not exists repertorio_noticias_publicado_idx
  on repertorio_noticias (publicado_em desc nulls last, coletado_em desc);
create index if not exists repertorio_noticias_fonte_idx on repertorio_noticias (fonte_id);
create index if not exists repertorio_noticias_guardada_idx
  on repertorio_noticias (guardada) where guardada;

-- Acesso só pelo servidor com a service role, como no resto do sistema.
alter table repertorio_fontes enable row level security;
alter table repertorio_noticias enable row level security;

-- Fontes de partida. GKPB, Propmark e Meio & Mensagem tiveram o feed conferido
-- em 26/10/2026. O TecMundo foi indicado pelo Vitor; se o site recusar a
-- leitura, o erro aparece em Repertório > Fontes.
insert into repertorio_fontes (nome, feed_url, tema) values
  ('Meio & Mensagem', 'https://www.meioemensagem.com.br/feed', 'Marketing'),
  ('Propmark', 'https://propmark.com.br/feed/', 'Marketing'),
  ('GKPB', 'https://gkpb.com.br/feed/', 'Marketing'),
  ('TecMundo', 'https://rss.tecmundo.com.br/feed', 'Tecnologia')
on conflict (feed_url) do nothing;
