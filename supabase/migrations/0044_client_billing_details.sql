-- Cadastro de cliente com o que a cobrança pede.
--
-- `name` continua sendo o nome curto que aparece nos cards e nas galerias;
-- os campos novos são os dados formais, que só interessam na hora de emitir
-- e cobrar a nota.

alter table gallery_clients
  add column if not exists company_name text;
alter table gallery_clients
  add column if not exists contact_name text;
alter table gallery_clients
  add column if not exists phone text;
alter table gallery_clients
  add column if not exists email text;
-- CNPJ ou CPF: quem contrata às vezes é pessoa física, e a nota aceita os dois.
alter table gallery_clients
  add column if not exists document text;
alter table gallery_clients
  add column if not exists address text;
alter table gallery_clients
  add column if not exists notes text;

-- Dia do mês em que o cliente costuma pagar. Vale para o mês seguinte ao da
-- entrega: entrega de agosto com vencimento 10 é cobrada até 10 de setembro.
alter table gallery_clients
  add column if not exists payment_day integer
    check (payment_day between 1 and 31);
