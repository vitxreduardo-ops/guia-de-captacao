-- Radar: lista de empresas vistas por aí, ainda sem contato feito.
--
-- Tabela separada de `prospects` de propósito. Entrar no funil obriga a ter
-- etapa e próximo passo — é a regra que o funil existe pra impor —, e uma
-- empresa que ainda é só um perfil interessante no Instagram não tem nem uma
-- coisa nem outra. Forçar isso aqui ou enche o funil de contato falso
-- "sem próximo passo", ou faz a pessoa não anotar. O radar é a caixa de
-- entrada; virar prospect é uma decisão posterior e manual.
create table if not exists prospect_radar (
  id uuid primary key default gen_random_uuid(),
  company text not null default '',
  -- Ramo como texto livre com sugestões na tela, igual à origem (0048) e às
  -- tags da Biblioteca (0036): a lista muda mais do que compensa cadastrar.
  sector text not null default '',
  instagram text not null default '',
  -- Vazio = ainda não olhei. Diferente de 'nao', que é uma informação.
  produces_content text not null default ''
    check (produces_content in ('', 'sim', 'nao', 'as_vezes', 'nao_sei')),
  contact text not null default '',
  comms_name text not null default '',
  referral text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table prospect_radar enable row level security;
