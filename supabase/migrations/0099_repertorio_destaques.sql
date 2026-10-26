-- Destaques da semana do Repertório: resumo por tema, feito por IA a partir
-- do título e do resumo das notícias dos últimos 7 dias. Um por tema e semana;
-- gerar de novo na mesma semana substitui o anterior.
--
-- `conteudo` guarda panorama, destaques e tendências, cada um com as notícias
-- que o sustentam (id, título, link e fonte copiados na hora): o destaque
-- continua legível mesmo se a fonte for apagada depois.
create table if not exists repertorio_destaques (
  id uuid primary key default gen_random_uuid(),
  tema text not null,
  -- Segunda-feira da semana, no fuso de Brasília.
  semana date not null,
  conteudo jsonb not null,
  total_noticias integer not null default 0,
  modelo text not null default '',
  gerado_em timestamptz not null default now(),
  unique (tema, semana)
);

alter table repertorio_destaques enable row level security;
