-- Hooks e CTAs alternativos e notas de produção por cena do guia: o mesmo
-- bloco que o gerador de roteiros (/admin/roteiros) devolve, agora também
-- no roteiro de cada vídeo do guia.
alter table scenes add column if not exists hooks_alternativos text[] not null default '{}';
alter table scenes add column if not exists ctas_alternativos text[] not null default '{}';
alter table scenes add column if not exists notas_producao text not null default '';
