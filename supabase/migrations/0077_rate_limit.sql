-- Limite de requisições por chave (ex.: "login:<ip>:<usuario>"). Contador em
-- memória não serve na Vercel: cada instância serverless teria o seu. Janela
-- fixa: a primeira batida abre a janela, e ela zera quando passa do tempo.

create table if not exists rate_limits (
  key text primary key,
  count int not null,
  window_start timestamptz not null
);

alter table rate_limits enable row level security;

-- Conta mais uma batida e diz se ainda está dentro do limite. Um upsert só,
-- então duas requisições ao mesmo tempo não escapam do contador.
create or replace function rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean
language sql
as $$
  insert into rate_limits as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end,
    window_start = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end
  returning count <= p_max;
$$;
