-- Cláusula 1 do modelo completo: os dados de quem contrata passam a vir dos
-- campos do contrato ({{cliente}}, {{documento}}, {{endereco}}), para que
-- "Importar de um cliente cadastrado" apareça no texto, e não só no painel.
--
-- Só os colchetes do CONTRATANTE (nome, documento, endereço). O representante
-- ([nome], [cargo], [CPF]) e o ponto focal seguem em branco para preencher.
--
-- Só o modelo: contrato já criado a partir dele é texto de cliente e não muda
-- por baixo. Reexecutável: sem o trecho antigo, não faz nada.

update contracts
set body = replace(
  body,
  '**CONTRATANTE:** [razão social ou nome completo], inscrita no CNPJ/CPF sob o nº [número], com sede em [endereço], neste ato',
  '**CONTRATANTE:** {{cliente}}, inscrita no CNPJ/CPF sob o nº {{documento}}, com sede em {{endereco}}, neste ato'
)
where slug = 'modelo-completo'
  and is_template = true;
