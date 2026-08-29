-- Biblioteca do estúdio de lettering: layouts salvos e fontes por cliente.
--
-- Até aqui o editor guardava um rascunho só, no navegador. Isso resolve perder
-- trabalho, mas não resolve repetir trabalho: cada peça recorrente é montada
-- do zero, e a fonte do cliente é carregada do arquivo toda vez.
--
-- `lettering_layouts.data` guarda a lista de camadas inteira como JSON, no
-- mesmo formato que o navegador já serializa no rascunho. O formato é do
-- editor, não do banco: por isso jsonb e não colunas por propriedade — o
-- editor ainda vai ganhar propriedades, e cada uma delas viraria uma migration.
--
-- `is_template` separa o que é peça salva do que é ponto de partida. É a mesma
-- estrutura porque um modelo nasce de uma peça que deu certo.

create table if not exists lettering_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lettering_layouts_updated_idx
  on lettering_layouts (updated_at desc);

-- A fonte fica no Storage; aqui mora só o cadastro dela.
--
-- `family` é o nome com que a fonte é registrada no navegador. Ele precisa ser
-- estável entre sessões: o layout salvo guarda esse nome dentro do JSON, e uma
-- família sorteada a cada carga quebraria todo layout salvo antes.
create table if not exists lettering_fonts (
  id uuid primary key default gen_random_uuid(),
  client text not null default '',
  label text not null,
  family text not null unique,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists lettering_fonts_client_idx
  on lettering_fonts (client, label);

-- Bucket privado: fonte de cliente é arquivo licenciado, não conteúdo público.
-- O acesso passa por uma rota do app, que já exige sessão do admin.
insert into storage.buckets (id, name, public)
values ('lettering-fonts', 'lettering-fonts', false)
on conflict (id) do nothing;
