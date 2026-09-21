-- A ordem dos modelos de apresentação passa a significar algo.
--
-- O gerador abre o modelo que perde menos linhas com os dados que existem, e
-- em empate fica o primeiro da lista. No Radar o empate é a regra: quase
-- nenhuma empresa tem nome de pessoa anotado, então todos perdem o
-- cumprimento e mais nada — e aí quem decidia era a ordem em que o banco
-- devolvia as linhas, que não é ordem nenhuma.
--
-- Com isto o desempate vira uma escolha: primeiro o texto que não afirma nada
-- sobre a empresa. Dizer "vi que vocês publicam com frequência" pra quem não
-- publica é o erro que não dá pra desfazer depois de enviado, e ele acontecia
-- sozinho, sem ninguém escolher. Os outros continuam a um clique no seletor,
-- pra quem abriu o perfil e sabe do que está falando.

update message_templates set position = 0 where name = 'Frio — só o ramo';
update message_templates set position = 1 where name = 'Não posta nada';
update message_templates set position = 2 where name = 'Posta, mas sem direção';
update message_templates set position = 3 where name = 'Elogio de verdade';
update message_templates set position = 4 where name = 'Indicação';
