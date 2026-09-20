-- Textos iniciais dos modelos de follow-up (0056).
--
-- Conteúdo, não schema, pelo mesmo motivo de 0049 e 0054: modelo em branco
-- não é usado, e escrever a mensagem do zero com o contato parado há duas
-- semanas é justamente o momento em que ninguém escreve.
--
-- O tom segue o que o funil já decidiu (0048): a relação é o produto. Nenhum
-- texto aqui cobra, cria urgência falsa ou insinua que a vaga acaba — esse
-- tipo de mensagem funciona uma vez e queima a relação que faz o estúdio
-- viver de indicação.
--
-- Variáveis: `{{nome}}` (com quem se fala), `{{empresa}}`, `{{dias}}` (desde o
-- último registro no histórico), `{{combinado}}` (o próximo passo anotado) e
-- `{{valor}}`. `where not exists` pelo nome torna o arquivo reexecutável.

insert into followup_templates (name, situation, position, body)
select * from (values
  (
    'Sem resposta — primeiro toque',
    'sem_resposta', 0,
    E'Oi, {{nome}}, tudo bem?\n\nMandei uma mensagem por aqui faz alguns dias e imagino que a semana tenha sido corrida. Sem pressa nenhuma — só queria saber se faz sentido pra vocês conversar sobre isso agora ou se é melhor eu voltar mais pra frente.\n\nQualquer uma das duas está ótima pra mim.'
  ),
  (
    'Depois da conversa — retomar',
    'pos_conversa', 0,
    E'Oi, {{nome}}! Gostei muito da nossa conversa sobre a {{empresa}}.\n\nFiquei de {{combinado}}. Segue aqui pra você olhar com calma.\n\nSe surgir qualquer dúvida, me chama que a gente resolve por aqui mesmo.'
  ),
  (
    'Proposta enviada — sem retorno',
    'pos_proposta', 0,
    E'Oi, {{nome}}, tudo certo?\n\nMandei a proposta faz {{dias}} dias e não quero que ela fique num limbo. Se tiver algum ponto que não ficou claro ou que ficou fora do orçamento de vocês, me diz que eu ajusto — é mais fácil mexer agora do que deixar parado.\n\nE se o momento não for esse, também pode falar tranquilo.'
  ),
  (
    'Cobrar a decisão, sem cobrar',
    'decisao', 0,
    E'Oi, {{nome}}! Tudo bem?\n\nVocê tinha comentado que ia fechar isso internamente. Não quero ficar batendo na porta — só me diz se ainda está de pé ou se caiu de prioridade, que eu me organizo aqui do meu lado.\n\nUm "não agora" me ajuda tanto quanto um sim.'
  ),
  (
    'Não agora — voltar na data',
    'nutricao', 0,
    E'Oi, {{nome}}, tudo bem?\n\nVocê tinha me dito que esse não era o momento, e eu anotei pra voltar por aqui justamente agora. Mudou alguma coisa aí na {{empresa}}?\n\nSe ainda não for a hora, me fala qual seria e eu volto lá na frente.'
  ),
  (
    'Sumiu faz tempo — recomeçar',
    'reativar', 0,
    E'Oi, {{nome}}! Faz um tempão que a gente não se fala.\n\nPassei pelo perfil da {{empresa}} esses dias e lembrei da nossa conversa. Não é cobrança de nada — se fizer sentido retomar, estou por aqui; se não, fica o abraço.'
  )
) as seed(name, situation, position, body)
where not exists (
  select 1 from followup_templates where followup_templates.name = seed.name
);
