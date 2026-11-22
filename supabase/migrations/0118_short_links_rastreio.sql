-- Encurtador, parte 2: rótulo, cliente, log de cada clique e aviso no primeiro
-- clique. Não guarda IP: só aparelho, país (cabeçalho da hospedagem) e o
-- domínio de origem.

alter table short_links
  add column if not exists rotulo text not null default '',
  add column if not exists client_id uuid references gallery_clients(id) on delete set null,
  add column if not exists avisar_primeiro_clique boolean not null default true,
  add column if not exists primeiro_clique_em timestamptz;

create index if not exists short_links_client_idx on short_links(client_id);

create table if not exists short_link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references short_links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  aparelho text not null default '',
  pais text,
  origem text
);
create index if not exists short_link_clicks_link_idx on short_link_clicks(link_id, clicked_at desc);
alter table short_link_clicks enable row level security;

-- Novo tipo de aviso da campainha: link aberto pela primeira vez.
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (
  kind in (
    'card_assigned', 'todo_assigned', 'card_moved', 'card_approved',
    'briefing_new', 'card_paid', 'client_idea', 'link_opened'
  )
);

-- Troca a função da parte 1. Uma ida só ao banco por clique: trava a linha,
-- grava o clique, soma e diz se foi o primeiro (atômico, sem aviso duplo).
-- Robô (prévia do WhatsApp etc.) só resolve o destino, sem contar.
drop function if exists registrar_clique_link(text);
create or replace function registrar_clique_link(
  p_slug text, p_aparelho text, p_pais text, p_origem text, p_robo boolean
)
returns table(url text, link_id uuid, rotulo text, avisar boolean, primeiro boolean)
language plpgsql
as $$
declare l short_links%rowtype;
begin
  select * into l from short_links where slug = p_slug for update;
  if not found then return; end if;
  if p_robo then
    return query select l.url, l.id, l.rotulo, false, false;
    return;
  end if;
  insert into short_link_clicks(link_id, aparelho, pais, origem)
    values (l.id, p_aparelho, p_pais, p_origem);
  update short_links
    set cliques = cliques + 1, primeiro_clique_em = coalesce(primeiro_clique_em, now())
    where id = l.id;
  return query select l.url, l.id, l.rotulo, l.avisar_primeiro_clique, l.primeiro_clique_em is null;
end;
$$;
