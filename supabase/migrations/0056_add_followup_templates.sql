-- Modelos de follow-up: o que se escreve quando o contato some.
--
-- O roteiro de etapa (0048) responde "o que eu digo nesta fase" e é o mesmo
-- para todo mundo que passa por ali. Follow-up é outra pergunta: não depende
-- de onde o contato está, e sim de quanto tempo faz que ele não responde e do
-- que aconteceu por último. Um contato parado há três dias depois da reunião e
-- um parado há três semanas depois da proposta estão na mesma etapa e pedem
-- mensagens opostas.
--
-- Por isso `situation` e não `stage_id`: a situação é o gatilho, e amarrar ao
-- funil obrigaria a duplicar o mesmo texto em cinco etapas.

create table if not exists followup_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Novo modelo',

  -- Fixo, ao contrário do nome: é o que permite sugerir sozinho o modelo
  -- provável a partir do estado do contato.
  situation text not null default 'sem_resposta'
    check (situation in (
      'sem_resposta',   -- mandou mensagem, não voltou
      'pos_conversa',   -- conversaram, falta o próximo passo
      'pos_proposta',   -- proposta enviada, sem retorno
      'decisao',        -- cobrar a decisão que ficou de vir
      'nutricao',       -- "não agora" que volta numa data
      'reativar'        -- sumiu faz tempo, recomeçar sem cobrança
    )),

  position integer not null default 0,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table followup_templates enable row level security;

create index if not exists followup_templates_order_idx
  on followup_templates(situation, position);
