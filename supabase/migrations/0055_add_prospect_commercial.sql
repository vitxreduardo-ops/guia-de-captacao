-- A camada comercial do funil de prospecção (0048).
--
-- O funil já sabia onde cada contato está e o que foi dito. O que ele não
-- sabia é quanto vale — e sem isso não dá pra responder as duas perguntas que
-- fazem o funil virar previsão: "quanto tem em jogo" e "quanto fechou no
-- mês". Três colunas na tabela que já existe, em vez de tabela nova: é o
-- mesmo contato, visto pelo lado do dinheiro.
--
-- O que segue deliberadamente de fora, pelo mesmo motivo de 0048 (o sistema
-- lembra, não julga): probabilidade de fechamento e valor ponderado. Um
-- número que diz "60% de chance" é chute apresentado como conta, e no tamanho
-- deste estúdio a conta ponderada erra mais do que a soma simples.

alter table prospects
  -- Valor em jogo. Zero = ainda não se falou de dinheiro, que é diferente de
  -- um contato sem valor nenhum.
  add column if not exists value numeric(10,2) not null default 0,

  -- De onde veio o número e no que ele virou. `set null` nos dois: apagar um
  -- orçamento não pode levar o histórico do contato junto.
  add column if not exists budget_id uuid references budgets(id) on delete set null,
  add column if not exists contract_id uuid references contracts(id) on delete set null,

  -- Quando fechou. O `updated_at` não serve: qualquer edição posterior o
  -- move, e aí "fechou em agosto" vira "fechou ontem" na primeira correção
  -- de telefone.
  add column if not exists closed_at timestamptz;

-- O painel soma por etapa e o fechado por mês: os dois varrem a tabela toda.
create index if not exists prospects_closed_idx on prospects(closed_at);
