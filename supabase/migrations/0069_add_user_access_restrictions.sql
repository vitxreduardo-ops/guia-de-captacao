-- Migração: acesso restrito por usuário. `allowed_sections` limita quais
-- seções do menu admin a pessoa vê (null = todas, o comportamento de hoje).
-- `allowed_client_ids` limita, dentro de Clientes e Galerias, a quais
-- clientes ela tem acesso (null = todos). Admin nunca é afetado por nenhum
-- dos dois — sempre acesso total.

alter table users
  add column if not exists allowed_sections text[],
  add column if not exists allowed_client_ids uuid[];
