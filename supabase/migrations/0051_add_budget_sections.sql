-- Migração: a proposta passa a ser uma lista de seções.
--
-- Até aqui a página pública tinha as seções fixas no JSX e a única forma de
-- esconder um bloco era apagar o conteúdo dele. Agora cada orçamento carrega
-- as 11 seções num array JSONB — com `enabled` por seção e o conteúdo junto —
-- e a ordem do array é a ordem da página.
--
-- Esta migração NÃO apaga nada: as colunas hero_*/about_*/highlights_title e as
-- tabelas budget_highlights/packages/faq/references continuam existindo e
-- alimentando o código antigo. O backfill abaixo só copia o que já existe para
-- o formato novo. Se algo sair errado, o rollback é ignorar a coluna.
-- A limpeza (drop das filhas) fica para uma migração posterior, depois de o
-- editor novo rodar estável em produção.

alter table budgets
  add column if not exists sections jsonb not null default '[]'::jsonb;

-- Backfill dos orçamentos que já existem.
--
-- Duas decisões de mapeamento, para não perder texto de proposta publicada:
--   * a capa usa client_name (com hero_title1 de reserva), que é o que o <h1>
--     da página pública já mostrava;
--   * hero_title1 + hero_title2 eram o statement grande do bloco "Sobre" —
--     viram o título da seção about, e o about_title antigo desce para
--     subtitle, em vez de um dos dois sumir.
--
-- Listas (items, features) são copiadas cruas: quem apara espaço e descarta
-- linha vazia é parseSections em lib/budgetSections.ts, para a regra viver num
-- lugar só.

update budgets b set sections = jsonb_build_array(

  jsonb_build_object('kind', 'cover', 'enabled', true, 'data', jsonb_build_object(
    'eyebrow', b.hero_eyebrow,
    'title', coalesce(nullif(b.client_name, ''), b.hero_title1),
    'subtitle', b.hero_subtitle,
    'cta', b.hero_cta,
    'videoUrl', b.hero_bg_video_url
  )),

  jsonb_build_object('kind', 'about',
    'enabled', (b.about_title <> '' or b.about_text <> '' or b.hero_title1 <> ''),
    'data', jsonb_build_object(
      'eyebrow', 'NOSSA LEITURA',
      'title', coalesce(
        nullif(btrim(b.hero_title1 || ' ' || b.hero_title2), ''),
        b.about_title
      ),
      'subtitle', case
        when btrim(b.hero_title1 || ' ' || b.hero_title2) <> '' then b.about_title
        else ''
      end,
      'text', b.about_text,
      'items', coalesce((
        select jsonb_agg(h.title order by h.position)
        from budget_highlights h where h.budget_id = b.id
      ), '[]'::jsonb),
      'statNumber', '',
      'statCaption', ''
    )),

  jsonb_build_object('kind', 'portfolio',
    'enabled', exists(select 1 from budget_references r where r.budget_id = b.id),
    'data', jsonb_build_object(
      'eyebrow', 'TRABALHOS SELECIONADOS',
      'title', '',
      'subtitle', '',
      'projects', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', r.caption,
          'tag', '',
          'url', r.image_url,
          'mediaType', 'image',
          'orientation', 'horizontal'
        ) order by r.position)
        from budget_references r where r.budget_id = b.id
      ), '[]'::jsonb)
    )),

  jsonb_build_object('kind', 'logos', 'enabled', false, 'data', jsonb_build_object(
    'eyebrow', 'QUEM JÁ CONFIA', 'title', '', 'logos', '[]'::jsonb
  )),

  jsonb_build_object('kind', 'package1', 'enabled', false, 'data', jsonb_build_object(
    'eyebrow', '', 'title', '', 'subtitle', '', 'items', '[]'::jsonb
  )),

  jsonb_build_object('kind', 'package1Extra', 'enabled', false, 'data', jsonb_build_object(
    'eyebrow', '', 'title', '', 'subtitle', '', 'items', '[]'::jsonb
  )),

  jsonb_build_object('kind', 'package2Perks', 'enabled', false, 'data', jsonb_build_object(
    'eyebrow', '', 'title', '', 'subtitle', '', 'items', '[]'::jsonb
  )),

  jsonb_build_object('kind', 'strategy', 'enabled', false, 'data', jsonb_build_object(
    'eyebrow', '', 'title', '', 'subtitle', '', 'items', '[]'::jsonb
  )),

  jsonb_build_object('kind', 'pricing',
    'enabled', exists(select 1 from budget_packages p where p.budget_id = b.id),
    'data', jsonb_build_object(
      'eyebrow', 'INVESTIMENTO',
      'title', coalesce(nullif(b.highlights_title, ''), 'Escolha a rota'),
      'subtitle', '',
      'cta', 'Escolher este pacote',
      'packages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', p.name,
          'price', p.price,
          'subtitle', p.tag,
          'description', '',
          'features', to_jsonb(string_to_array(p.features, E'\n')),
          'featured', (p.tag <> '')
        ) order by p.position)
        from budget_packages p where p.budget_id = b.id
      ), '[]'::jsonb)
    )),

  jsonb_build_object('kind', 'faq',
    'enabled', exists(select 1 from budget_faq f where f.budget_id = b.id),
    'data', jsonb_build_object(
      'eyebrow', 'DÚVIDAS FREQUENTES',
      'title', 'Perguntas frequentes',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('question', f.question, 'answer', f.answer)
          order by f.position)
        from budget_faq f where f.budget_id = b.id
      ), '[]'::jsonb)
    )),

  jsonb_build_object('kind', 'footer', 'enabled', true, 'data', jsonb_build_object(
    'phrase', '', 'instagram', '', 'youtube', '', 'email', '', 'phone', b.client_whatsapp
  ))

) where b.sections = '[]'::jsonb;
