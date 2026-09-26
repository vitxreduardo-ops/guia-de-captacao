-- Notas de produção saem da cena e vão pro vídeo: um campo só, mostrado
-- depois da última cena. As notas que já existiam nas cenas (0067) são
-- juntadas no vídeo, na ordem das cenas, antes de a coluna sair.

alter table videos add column if not exists notas_producao text not null default '';

update videos v
set notas_producao = agregadas.notas
from (
  select video_id, string_agg(notas_producao, E'\n\n' order by position) as notas
  from scenes
  where notas_producao <> ''
  group by video_id
) agregadas
where agregadas.video_id = v.id and v.notas_producao = '';

alter table scenes drop column if exists notas_producao;
