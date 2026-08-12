-- Migração: troca o identificador de login de e-mail pra nome de usuário
-- (mais simples de digitar/lembrar pra um time pequeno) — mesma coluna,
-- só renomeada.

alter table users rename column email to username;
