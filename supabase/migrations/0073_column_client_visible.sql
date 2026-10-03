-- Quais colunas do quadro de entregas o cliente enxerga no portal. Padrão
-- falso: o quadro tem títulos internos ("TREND - ISSO NÃO IA") que não são
-- pro cliente, então nada aparece até a equipe marcar uma coluna.

alter table backlog_columns
  add column if not exists client_visible boolean not null default false;
