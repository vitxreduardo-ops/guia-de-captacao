-- Adiciona o campo "descrição de cena", exibido abaixo do roteiro/fala.
alter table scenes add column if not exists description text not null default '';
