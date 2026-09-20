-- Modelos de partida dos contratos (0053).
--
-- Conteúdo, não schema — mas mora aqui pelo mesmo motivo dos roteiros de
-- prospecção (0049): contrato que nasce em branco não é usado, e o texto que
-- se repete em todo contrato é justamente o que ninguém quer reescrever.
--
-- `where not exists` pelo slug torna o arquivo reexecutável: o corpo é
-- editável pela tela, e rodar a migration de novo não pode sobrescrever o que
-- o Vitor reescreveu.
--
-- As variáveis `{{cliente}}`, `{{documento}}`, `{{escopo}}`, `{{valor}}`,
-- `{{pagamento}}`, `{{inicio}}` e `{{meses}}` são trocadas na hora de exibir
-- (lib/contracts.ts). Onde ainda faltar dado, o texto mostra a variável — é
-- de propósito: em branco, ninguém percebe que esqueceu.
--
-- Isto é um modelo de trabalho, não parecer jurídico. Antes de usar com
-- cliente, passar pelo advogado do estúdio.

insert into contracts (slug, title, kind, is_template, body)
select 'modelo-mensal', 'Modelo — contrato mensal', 'mensal', true,
$corpo$## Partes

**CONTRATADA:** Tatu Estúdio Criativo.

**CONTRATANTE:** {{cliente}}, inscrita sob o documento {{documento}}.

## 1. Objeto

A CONTRATADA prestará à CONTRATANTE, de forma continuada, os seguintes
serviços:

{{escopo}}

## 2. Prazo

O contrato tem início em {{inicio}} e vigência de {{meses}} meses, renovando-se
automaticamente por iguais períodos caso nenhuma das partes se manifeste em
contrário com 30 (trinta) dias de antecedência.

## 3. Valor e pagamento

Pelos serviços do item 1, a CONTRATANTE pagará à CONTRATADA o valor mensal de
{{valor}}.

{{pagamento}}

O atraso superior a 15 (quinze) dias autoriza a CONTRATADA a suspender as
entregas até a regularização, sem que isso configure descumprimento.

## 4. Rodadas de ajuste

Cada entrega comporta até 2 (duas) rodadas de ajuste dentro do escopo
combinado. Ajustes que mudem o escopo são orçados à parte.

## 5. Prazos e dependências

Os prazos correm a partir do recebimento, pela CONTRATADA, de todo o material
necessário (textos, imagens, acessos e aprovações). Atraso no envio desloca a
entrega no mesmo número de dias.

## 6. Direitos sobre o material

A CONTRATANTE recebe os direitos de uso do material entregue e aprovado, para
os fins descritos no item 1, após a quitação da parcela correspondente. Os
arquivos abertos e o material não aprovado permanecem com a CONTRATADA.

A CONTRATADA pode exibir o trabalho em seu portfólio e redes, salvo pedido
expresso da CONTRATANTE em contrário.

## 7. Confidencialidade

As partes se obrigam a não divulgar informações a que tiverem acesso em razão
deste contrato, durante a vigência e por 2 (dois) anos após o seu término.

## 8. Rescisão

Qualquer das partes pode encerrar o contrato mediante aviso de 30 (trinta)
dias. As entregas em andamento são concluídas e faturadas normalmente.

## 9. Foro

Fica eleito o foro da comarca de domicílio da CONTRATADA para dirimir dúvidas
oriundas deste contrato.
$corpo$
where not exists (select 1 from contracts where slug = 'modelo-mensal');

insert into contracts (slug, title, kind, is_template, body)
select 'modelo-freela', 'Modelo — projeto fechado', 'freela', true,
$corpo$## Partes

**CONTRATADA:** Tatu Estúdio Criativo.

**CONTRATANTE:** {{cliente}}, inscrita sob o documento {{documento}}.

## 1. Objeto

A CONTRATADA executará, em projeto fechado, o seguinte trabalho:

{{escopo}}

## 2. Prazo de entrega

O trabalho tem início em {{inicio}} e será entregue conforme o cronograma
combinado entre as partes. Os prazos correm a partir do recebimento de todo o
material necessário (textos, imagens, acessos e aprovações).

## 3. Valor e pagamento

Pelo trabalho do item 1, a CONTRATANTE pagará à CONTRATADA o valor total de
{{valor}}.

{{pagamento}}

O início da execução fica condicionado à confirmação da primeira parcela.

## 4. Rodadas de ajuste

O projeto comporta até 2 (duas) rodadas de ajuste dentro do escopo combinado.
Ajustes que mudem o escopo são orçados à parte.

## 5. Direitos sobre o material

A CONTRATANTE recebe os direitos de uso do material entregue e aprovado, para
os fins descritos no item 1, após a quitação integral do valor. Os arquivos
abertos e o material não aprovado permanecem com a CONTRATADA.

A CONTRATADA pode exibir o trabalho em seu portfólio e redes, salvo pedido
expresso da CONTRATANTE em contrário.

## 6. Cancelamento

Cancelado o projeto pela CONTRATANTE, ficam devidos os valores das etapas já
executadas, e as parcelas já pagas não são restituídas.

## 7. Confidencialidade

As partes se obrigam a não divulgar informações a que tiverem acesso em razão
deste contrato, durante a vigência e por 2 (dois) anos após o seu término.

## 8. Foro

Fica eleito o foro da comarca de domicílio da CONTRATADA para dirimir dúvidas
oriundas deste contrato.
$corpo$
where not exists (select 1 from contracts where slug = 'modelo-freela');
