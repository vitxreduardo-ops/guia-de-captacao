-- Um lugar só para os textos que o estúdio manda.
--
-- Eram três: abordagem (0058), follow-up (0056) e o roteiro preso a cada
-- etapa (0048). Os três respondem a mesma pergunta — o que eu escrevo agora —
-- e a divisão era pela pessoa te conhecer ou não, que na prática não muda
-- nada: o que decide o texto é o que você quer que aconteça em seguida.
--
-- Por isso a situação deixou de descrever o passado ("proposta enviada, sem
-- retorno") e passou a nomear o objetivo ("saber a decisão"). Com isso o
-- roteiro de etapa perde a razão de existir: ele dizia o mesmo, preso a uma
-- fase do funil, e o mesmo texto tinha que ser repetido em cada etapa onde
-- servia.
--
-- As tabelas antigas continuam de pé, sem ninguém lendo, até a próxima
-- limpeza — derrubá-las no mesmo passo em que o conteúdo se mudou não deixa
-- volta se algo tiver ficado para trás. Anotado no TODO.md.

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Novo modelo',

  situation text not null default 'apresentar'
    check (situation in (
      'apresentar',      -- ele não sabe quem eu sou
      'marcar_conversa', -- respondeu; quero hora marcada
      'mandar_proposta', -- conversamos; agora vai o orçamento
      'saber_decisao',   -- proposta parada; preciso de sim ou não
      'voltar_depois',   -- "não agora", com data pra retomar
      'recomecar'        -- sumiu faz meses
    )),

  position integer not null default 0,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table message_templates enable row level security;

create index if not exists message_templates_order_idx
  on message_templates(situation, position);

-- ------------------------------------------------------- mudança do texto

-- Abordagem inteira vira "apresentar": os cinco ângulos (indicação, posta
-- bem, não posta...) continuam sendo cinco modelos, porque o que muda entre
-- eles é a primeira linha, e é ela que faz a mensagem parecer escrita pra
-- aquela empresa.
insert into message_templates (name, situation, position, body)
select name, 'apresentar', position, body
from outreach_templates
where not exists (
  select 1 from message_templates m where m.name = outreach_templates.name
);

-- Follow-up: a situação antiga contava o que tinha acontecido, a nova diz o
-- que se quer. "Mandei e não voltou" e "esperando decisão" viravam textos
-- diferentes pelo mesmo motivo — daí caírem em objetivos distintos.
insert into message_templates (name, situation, position, body)
select
  name,
  case situation
    when 'sem_resposta' then 'marcar_conversa'
    when 'pos_conversa' then 'mandar_proposta'
    when 'pos_proposta' then 'saber_decisao'
    when 'decisao'      then 'saber_decisao'
    when 'nutricao'     then 'voltar_depois'
    when 'reativar'     then 'recomecar'
    else 'apresentar'
  end,
  position,
  body
from followup_templates
where not exists (
  select 1 from message_templates m where m.name = followup_templates.name
);

-- O roteiro de cada etapa vira modelo com o nome da etapa. Etapa sem roteiro
-- escrito não gera linha: seis modelos vazios seriam seis opções inúteis no
-- seletor.
insert into message_templates (name, situation, position, body)
select
  'Roteiro — ' || s.name,
  case s.kind
    when 'nutricao' then 'voltar_depois'
    when 'ganha'    then 'mandar_proposta'
    when 'perdida'  then 'recomecar'
    else 'marcar_conversa'
  end,
  10 + s.position,
  s.playbook
from prospect_stages s
where trim(s.playbook) <> ''
  and not exists (
    select 1 from message_templates m where m.name = 'Roteiro — ' || s.name
  );
