-- Roteiros iniciais das 9 etapas de prospecção (0048).
--
-- Conteúdo, não schema — mas mora aqui porque é o que faz a feature nascer
-- usável: etapa sem roteiro deixa a fila mostrando contato sem dizer o que
-- falar, e foi por isso que o funil foi construído.
--
-- `and playbook = ''` em toda linha é a trava que torna isto reexecutável: o
-- campo é editável pela tela (/admin/prospeccao/etapas), e rodar a migration
-- de novo não pode apagar o que o Vitor reescreveu. Etapa renomeada também
-- não é atingida, já que o `where` casa pelo nome original.
--
-- Texto passado pelo humanizer (sem travessão, sem frase de efeito). Os
-- rótulos vão em caixa alta porque o campo é renderizado como texto puro,
-- sem markdown: asterisco apareceria na tela.
--
-- Aplicada em produção em 13/09/2026.





update prospect_stages set playbook = $r$OBJETIVO: decidir se vale falar. Nada é enviado nesta etapa.

Antes de qualquer mensagem, responda três coisas:
1. Quem decide? (nome, não cargo)
2. Já pagou por conteúdo audiovisual? Pra quem, quanto, quando?
3. O que está acontecendo com eles agora? (abriu unidade, trocou de marca, entrou sócio, parou de postar)

Se não achar a terceira, não avance. É ela que vira o gancho, e sem ela a mensagem é "oi, faço vídeo".

ESCUTAR (no perfil, não com a pessoa): postagem que parou há mais de 60 dias, foto de produto com luz ruim, vídeo de celular na mão, agência que posta o mesmo template pra dez clientes.

SAÍDA: ou vira Primeiro contato com o gancho escrito, ou sai da lista. Ninguém fica morando aqui.$r$ where name = 'Radar' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: uma resposta. Não uma reunião e não uma venda.

Estrutura da mensagem, nesta ordem:
1. A observação específica, algo que só vale pra eles e é impossível de copiar e colar pro próximo
2. O que você notou que poderia melhorar, em uma linha, sem laudo
3. Uma pergunta fechada, respondível com uma palavra

Não mande portfólio. Não mande preço. Não mande apresentação em PDF.

SE VIER "quanto custa": "Depende do que a gente descobrir numa conversa de 30 minutos. Topa quinta às 10?"

ESCUTAR: qualquer resposta, mesmo curta, já é permissão. Se visualizou e não respondeu, faça mais um toque em 9 dias com ângulo diferente. Depois de dois toques sem resposta, mande pra Nutrição em vez de insistir.

SAÍDA: data e hora marcadas, ou data do próximo toque. Nunca encerre com "vou aguardar".$r$ where name = 'Primeiro contato' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: que ele fale 80% do tempo.

Abertura: "Me conta como vocês resolvem conteúdo hoje."

Depois só puxe o fio:
1. Quem faz? Desde quando?
2. O que vocês esperavam que acontecesse?
3. O que de fato aconteceu?
4. O que te incomoda mais nisso?

Não abra portfólio nos primeiros 20 minutos. Se abrir, a conversa vira avaliação de trabalho e você perde o diagnóstico.

ESCUTAR: ele descrever um problema com as palavras dele. Anote as palavras exatas, porque são elas que voltam na proposta. Se ele não consegue nomear nenhum problema, não é hora, é Nutrição.

SAÍDA: data do diagnóstico, ou a verdade de que não é cliente agora.$r$ where name = 'Conversa marcada' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: entender o que já tentaram e por que não funcionou. Quase ninguém faz esta etapa, e é a que mais fecha.

Três perguntas, nesta ordem:
1. "O que vocês já tentaram?"
2. "Por que parou?"
3. "Se nada mudar, como está isso daqui a seis meses?"

A terceira dói, e é pra doer. Faça e fique quieto.

Depois, as alternativas reais: o sobrinho com iPhone, o social media de mil reais, a agência grande, e não fazer nada. Diga em voz alta o que cada uma tem de bom. Elogiar o concorrente compra credibilidade para a crítica que vem depois.

ESCUTAR: orçamento aproximado, quem mais decide, prazo. Sem esses três, a proposta é chute.

SAÍDA: combine a data de apresentar a proposta. Data, e não "semana que vem".$r$ where name = 'Diagnóstico' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: apresentar ao vivo. Nunca mande o link e espere.

Ordem da apresentação:
1. O que eu entendi do problema, nas palavras dele
2. As alternativas, incluindo não fazer nada
3. O que proponho e por quê
4. Prova: um caso parecido, com número
5. As objeções antes que ele levante
6. O pedido

SE ELE PEDIR "manda por e-mail que eu vejo": "Mando sim, mas prefiro passar os 15 minutos com você junto. Tem uma parte que não se explica sozinha. Terça às 9?"

ESCUTAR: silêncio na hora do preço é normal, deixe existir. Quem conta seu dinheiro em voz alta está negociando, não recusando.

SAÍDA: data da resposta, marcada antes de desligar.$r$ where name = 'Proposta enviada' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: entender o que está travando de verdade. Preço é o que se diz, e raramente é o motivo.

Uma pergunta antes de qualquer concessão: "Fora o valor, tem mais alguma coisa te segurando?"
- Se vier outra coisa, o preço não era o problema
- Se não vier nada, é preço mesmo, e aí o que muda é escopo, nunca a tabela

Reduzir preço sem tirar escopo ensina que o primeiro número era mentira.

ESCUTAR: "preciso falar com meu sócio" quer dizer que faltou gente na sala. Peça pra falar com ele junto.

SAÍDA: ou assinatura, ou data limite combinada por ele mesmo.$r$ where name = 'Negociação' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: transformar o sim em começo, e o começo em indicação.

Nas primeiras 48 horas, acerte o contrato e a primeira data de gravação, defina quem é o contato do dia a dia e pergunte o que ele espera ver primeiro.

No fim do primeiro mês, uma pergunta só: "Quem mais você conhece que está com esse mesmo problema?" Pergunte quando a entrega estiver fresca, não seis meses depois.

ESCUTAR: o que ele conta pros outros sobre o trabalho. Use essas palavras na próxima venda, porque foram escritas por um cliente.

SAÍDA: data de revisão do primeiro ciclo.$r$ where name = 'Fechado' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: aprender e deixar a porta aberta.

Um pedido, sem defesa: "Só pra eu melhorar, o que pesou na decisão?" Não argumente com a resposta e não tente reverter aqui.

Escreva o motivo com as palavras dele, específico. "Achou caro" não ensina nada. "Achou caro comparado ao social media de R$ 900 que ele já paga" mostra o padrão depois de dez perdas.

ESCUTAR: se contratou outro, pergunte quem. Saber com quem você perde vale mais do que saber que perdeu.

SAÍDA: mover pra Nutrição com data. Perdido quer dizer "agora não".$r$ where name = 'Perdido' and playbook = '';

update prospect_stages set playbook = $r$OBJETIVO: existir na cabeça dele sem pedir nada.

Um toque a cada 60 dias, e o toque tem que servir pra ele mesmo que nunca contrate: um corte que lembra o negócio dele, uma observação sobre algo que ele publicou, uma indicação de cliente que não é sua.

O QUE NÃO FAZER: "passando pra saber se ainda tem interesse". Isso pede sem dar.

ESCUTAR: resposta calorosa depois de dois toques significa que ele volta pra Primeiro contato. Silêncio depois de três significa tirar da lista, sem drama.

SAÍDA: nova data. Sempre sai daqui com data.$r$ where name = 'Nutrição' and playbook = '';
