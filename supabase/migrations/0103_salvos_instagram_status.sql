-- Estado da conexão da varredura dos Salvos do Instagram (uma linha só).
-- 'login' = a sessão do Instagram caiu e a tarefa agendada parou; a tela
-- /admin/referencias/salvos mostra o aviso até a próxima varredura dar certo.
create table if not exists instagram_saved_status (
  id int primary key default 1 check (id = 1),
  state text not null default 'ok' check (state in ('ok', 'login')),
  checked_at timestamptz not null default now(),
  ok_at timestamptz
);
alter table instagram_saved_status enable row level security;
insert into instagram_saved_status (id) values (1) on conflict do nothing;
