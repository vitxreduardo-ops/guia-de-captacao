-- Contexto da empresa e da campanha no gerador de roteiros: guardado junto
-- do roteiro pra o histórico mostrar de onde ele saiu.
alter table roteiros add column if not exists contexto text not null default '';
