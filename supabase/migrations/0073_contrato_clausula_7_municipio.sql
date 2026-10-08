-- Cláusula 7 do modelo completo: o título citava a cidade, e a 7.1 já cita.
-- Fica só na 7.1; o título passa a dizer "município".
--
-- Só o modelo (is_template): contratos já criados a partir dele são texto do
-- cliente e não mudam por baixo. Reexecutável: sem o texto antigo, não faz nada.

update contracts
set body = replace(
  body,
  'Das captações fora de Luís Eduardo Magalhães',
  'Das captações fora do município'
)
where slug = 'modelo-completo'
  and is_template = true;
