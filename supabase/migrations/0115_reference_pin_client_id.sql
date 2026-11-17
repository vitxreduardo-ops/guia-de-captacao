-- Referências ligadas ao cliente por id, não só pelo nome digitado.
--
-- `reference_pins.client` (0084) é texto livre e continua: é o que o mural
-- mostra e o que o formulário grava. `client_id` é o vínculo de verdade, usado
-- pelo agente pra respeitar o acesso de quem pergunta e pra achar as
-- referências de um cliente mesmo depois de ele trocar de nome.
--
-- on delete set null: apagar o cliente não apaga a referência, que passa a
-- valer como geral (o nome fica no texto).
alter table reference_pins
  add column if not exists client_id uuid references gallery_clients(id) on delete set null;

create index if not exists reference_pins_client_id_idx on reference_pins(client_id);

-- Liga o que já existe quando o nome bate sem ambiguidade (mesma grafia, sem
-- diferença de caixa e sem repetir entre clientes). O resto fica sem id.
update reference_pins p
   set client_id = g.id
  from gallery_clients g
 where p.client_id is null
   and p.client <> ''
   and lower(trim(p.client)) = lower(trim(g.name))
   and (select count(*) from gallery_clients g2 where lower(trim(g2.name)) = lower(trim(p.client))) = 1;
