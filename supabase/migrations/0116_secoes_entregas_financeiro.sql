-- A seção "Clientes" do menu virou duas: Entregas e Financeiro. Quem tinha
-- `clientes` em `allowed_sections` ganha as duas. `clientes` fica na lista de
-- propósito: o código antigo e o novo funcionam com ela, então a migration
-- pode rodar antes do deploy sem tirar o acesso de ninguém. Quem tem
-- `allowed_sections` nulo (sem restrição) não muda. Pode rodar de novo.
update users
   set allowed_sections = (
     select array_agg(distinct s)
       from unnest(allowed_sections || array['entregas', 'financeiro']) as s
   )
 where 'clientes' = any(allowed_sections);
