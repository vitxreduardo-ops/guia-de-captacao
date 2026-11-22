-- Encurtador, parte 3: desativar, prazo de validade e UTM automático.
-- Link desativado ou vencido deixa de resolver (cai na home) mas o histórico fica.

alter table short_links
  add column if not exists ativo boolean not null default true,
  add column if not exists expira_em timestamptz,
  add column if not exists utm boolean not null default false;

-- O retorno ganha `utm`, então a função precisa ser recriada do zero.
drop function if exists registrar_clique_link(text, text, text, text, boolean);
create or replace function registrar_clique_link(
  p_slug text, p_aparelho text, p_pais text, p_origem text, p_robo boolean
)
returns table(url text, link_id uuid, rotulo text, avisar boolean, primeiro boolean, utm boolean)
language plpgsql
as $$
declare l short_links%rowtype;
begin
  select * into l from short_links
    where slug = p_slug and ativo and (expira_em is null or expira_em > now())
    for update;
  if not found then return; end if;
  if p_robo then
    return query select l.url, l.id, l.rotulo, false, false, l.utm;
    return;
  end if;
  insert into short_link_clicks(link_id, aparelho, pais, origem)
    values (l.id, p_aparelho, p_pais, p_origem);
  update short_links
    set cliques = cliques + 1, primeiro_clique_em = coalesce(primeiro_clique_em, now())
    where id = l.id;
  return query select l.url, l.id, l.rotulo, l.avisar_primeiro_clique, l.primeiro_clique_em is null, l.utm;
end;
$$;
