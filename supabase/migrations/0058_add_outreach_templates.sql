-- Modelos de abordagem: a primeira mensagem, a que nunca foi mandada.
--
-- Follow-up (0056) é o que se escreve pra quem já conhece a gente. Aqui é o
-- oposto: ninguém sabe quem você é, e a única coisa que faz a mensagem ser
-- lida é ela provar, na primeira linha, que não foi disparada pra mil
-- empresas iguais. Por isso o gatilho é o ângulo — o que eu sei sobre esta
-- empresa que me dá o direito de falar com ela.
--
-- O ângulo sai do que o Radar (0050) já guarda: se veio por indicação, se
-- produz conteúdo, qual o ramo. Nada aqui inventa dado novo pra preencher.

create table if not exists outreach_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nova abordagem',

  angle text not null default 'frio'
    check (angle in (
      'indicacao',       -- alguém me mandou, e o nome abre a porta
      'conteudo_fraco',  -- posta, mas dá pra ver que é sem direção
      'sem_conteudo',    -- não posta nada
      'elogio',          -- posta bem, e é isso que eu quero dizer
      'frio'             -- não sei nada além do ramo
    )),

  position integer not null default 0,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table outreach_templates enable row level security;

create index if not exists outreach_templates_order_idx
  on outreach_templates(angle, position);
