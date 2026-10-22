-- Mapa mental passa a poder pertencer a um cliente (os de `gallery_clients`),
-- pra a tela de mapas agrupar por cliente. Nulo = mapa solto.
alter table mind_maps
  add column if not exists client_id uuid references gallery_clients(id) on delete set null;

create index if not exists mind_maps_client_id_idx on mind_maps(client_id);
