-- Textos iniciais das abordagens (0058).
--
-- Mesma regra dos follow-ups (0057): nada de urgência falsa, nada de "vi que
-- vocês estão perdendo dinheiro". A primeira mensagem que acusa o outro de
-- estar fazendo errado é a que não recebe resposta — e num estúdio que vive
-- de indicação, é a que queima o nome com quem indicaria.
--
-- Variáveis: `{{empresa}}`, `{{pessoa}}`, `{{ramo}}`, `{{indicacao}}` e
-- `{{perfil}}`. Linha com variável vazia sai inteira, como em 0057 — por isso
-- o "oi" e a apresentação ficam em linhas separadas: no Radar o nome da
-- pessoa costuma faltar, e numa linha só o sumiço do cumprimento levaria
-- junto o "aqui é o Vitor", que é a única coisa que a mensagem não pode
-- perder.

insert into outreach_templates (name, angle, position, body)
select * from (values
  (
    'Indicação',
    'indicacao', 0,
    E'Oi, {{pessoa}}, tudo bem?\nAqui é o Vitor, do Tatu Estúdio.\n\n{{indicacao}} comentou comigo sobre a {{empresa}} e falou pra eu te procurar.\n\nA gente cuida de conteúdo e identidade pra marcas de {{ramo}}. Não quero te tomar tempo com apresentação: se fizer sentido, me diz um horário esta semana que eu te mostro em 15 minutos o que dá pra fazer aí.'
  ),
  (
    'Posta, mas sem direção',
    'conteudo_fraco', 0,
    E'Oi, {{pessoa}}!\nAqui é o Vitor, do Tatu Estúdio.\n\nAndei olhando o perfil da {{empresa}} e dá pra ver que vocês publicam com frequência — o que já é mais do que a maioria faz. O que me chamou atenção é que cada post parece de uma marca diferente.\n\nIsso costuma ser bem rápido de resolver e muda o resultado inteiro. Posso te mandar por aqui dois ou três exemplos do que eu faria?'
  ),
  (
    'Não posta nada',
    'sem_conteudo', 0,
    E'Oi, {{pessoa}}, tudo bem?\nAqui é o Vitor, do Tatu Estúdio.\n\nFui procurar a {{empresa}} no Instagram e o perfil está parado. Imagino que não seja falta de vontade e sim de tempo — é o que acontece em nove de cada dez empresas de {{ramo}} com que eu falo.\n\nA gente trabalha justamente pra isso não depender de você sentar pra fazer. Vale uma conversa de 15 minutos pra eu entender o momento de vocês?'
  ),
  (
    'Elogio de verdade',
    'elogio', 0,
    E'Oi, {{pessoa}}!\nAqui é o Vitor, do Tatu Estúdio.\n\nSó pra dizer que o perfil da {{empresa}} está muito bem feito — não é o que eu costumo ver em {{ramo}}.\n\nSe em algum momento vocês quiserem uma mão pra dar conta do volume sem perder esse nível, é exatamente o que a gente faz. Fica o contato, sem compromisso nenhum.'
  ),
  (
    'Frio — só o ramo',
    'frio', 0,
    E'Oi, {{pessoa}}, tudo bem?\nAqui é o Vitor, do Tatu Estúdio.\n\nA gente cuida de conteúdo e identidade visual pra marcas de {{ramo}}, e a {{empresa}} entrou no meu radar.\n\nNão vou te mandar apresentação: prefiro entender primeiro como vocês resolvem isso hoje. Faz sentido uma conversa rápida esta semana?'
  )
) as seed(name, angle, position, body)
where not exists (
  select 1 from outreach_templates where outreach_templates.name = seed.name
);
