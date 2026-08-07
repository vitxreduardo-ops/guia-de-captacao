-- Migração: introduz o nível "videos" entre guides e scenes.
-- Segura para rodar em qualquer estado do banco: só faz o backfill de dados
-- se a coluna antiga "scenes.guide_id" ainda existir; caso seu banco já
-- esteja no schema novo (ex: rodou o schema.sql atualizado direto), este
-- script não faz nada de destrutivo.

do $$
begin
  if not exists (
    select 1 from information_schema.tables where table_name = 'videos'
  ) then
    create table videos (
      id uuid primary key default gen_random_uuid(),
      guide_id uuid not null references guides(id) on delete cascade,
      position integer not null default 0,
      title text not null default ''
    );
    alter table videos enable row level security;
    create index videos_guide_id_idx on videos(guide_id);
  end if;
end $$;

do $$
begin
  -- só faz o backfill se "scenes" ainda tiver a coluna antiga "guide_id"
  if exists (
    select 1 from information_schema.columns
    where table_name = 'scenes' and column_name = 'guide_id'
  ) then
    insert into videos (guide_id, position, title)
    select distinct guide_id, 0, 'Vídeo 1'
    from scenes
    where guide_id is not null;

    alter table scenes add column if not exists video_id uuid references videos(id) on delete cascade;

    update scenes
    set video_id = videos.id
    from videos
    where scenes.video_id is null
      and videos.guide_id = scenes.guide_id
      and videos.title = 'Vídeo 1';

    alter table scenes alter column video_id set not null;
    drop index if exists scenes_guide_id_idx;
    alter table scenes drop column guide_id;
  end if;
end $$;

create index if not exists scenes_video_id_idx on scenes(video_id);
