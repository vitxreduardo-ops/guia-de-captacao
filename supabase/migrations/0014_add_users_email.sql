-- Migração: adiciona e-mail como dado de contato do usuário, separado do
-- username (que continua sendo o identificador de login).

alter table users add column if not exists email text not null default '';
