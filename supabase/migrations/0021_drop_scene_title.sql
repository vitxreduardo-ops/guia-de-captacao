-- Remove o campo "título da cena", substituído pela "descrição de cena".
-- Pré-requisito: rodar 0020_add_scene_description.sql e copiar os títulos
-- antigos para a descrição antes de executar este drop (irreversível).
alter table scenes drop column if exists title;
