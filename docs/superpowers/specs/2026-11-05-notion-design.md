# Notion da Tatu — design

## Intenção
Vitor perde notas, links e artifacts em chats do Claude/ChatGPT e apps de notas soltos. Quer um lugar único dentro do admin, no estilo do Notion: notas de texto, links aleatórios, artifacts agrupados em páginas e subpáginas. Biblioteca, Referências e Mapa mental passam a ser ferramentas "filhas" acessadas por botões dentro dele.

## Objetivos
1. Árvore de páginas e subpáginas sem limite de profundidade, na barra lateral do próprio Notion (abrir/fechar, arrastar pra reorganizar).
2. Editor de blocos "como o Notion": menu `/`, blocos arrastáveis, transformar bloco em outro tipo. Blocos mínimos: texto, títulos 1-3, listas (marcadores, numerada, tarefas), citação, destaque (callout), divisor, código, imagem, link para página, subpágina.
3. Colar uma URL abre um menuzinho com 3 escolhas (ideia do Vitor): **só link**, **anotação** (cartão com título/ícone/descrição + campo de nota própria) ou **embed**. Se o site bloquear iframe, embed cai sozinho para anotação.
4. Artifact = bloco de embed de URL (links de artifact do claude.ai). Agrupar artifacts = colocá-los numa página/subpágina.
5. Hub: página inicial do Notion com botões para Biblioteca, Referências e Mapa mental (rotas atuais, intactas). Botão só aparece se o usuário tem acesso à seção.
6. Achar coisas: busca por título e texto, Favoritos, Recentes.
7. Autosave (debounce, como o mapa mental) com estado salvo/pendente/erro.

## Não-objetivos
Colaboração em tempo real, comentários, bases de dados e visões (tabela/quadro/calendário), IA, templates, web clipper, backlinks/menções `@` (podem vir depois), permissão por página, offline, app mobile dedicado.

## Anti-objetivos (falha mesmo que "funcione")
- Perder texto por autosave que falha em silêncio.
- Quebrar as rotas atuais de Biblioteca, Referências ou Mapa mental.
- Editor que parece texto cru, sem `/` nem arrastar.
- Misturar com os quadros Backlog/Entregas (CLAUDE.md do repo): este módulo não toca `backlog_cards`.

## Restrições do projeto (verificadas no código em 05/11/2026)
- Next 16.3 / React 19: ler `node_modules/next/dist/docs/` antes de codar (AGENTS.md). Usa `proxy.ts`, `params` como Promise.
- Padrão de cada ferramenta: `page.tsx` server → componente client → `actions.ts` com `requireTeam("<secao>")` → `lib/<x>.ts` server-only com Supabase service role → tabela com RLS ligada e sem policy. Seguir.
- Menu: item novo no array `ACTIONS` em `components/admin/adminActions.ts` (grupo "Criação"); o código da seção sai do href (`/admin/notion` → `notion`), sem editar `proxy.ts`.
- Migrations numeradas; a última é `0103`. Convenção `create table if not exists`.
- Sem ownership por usuário nas tabelas existentes: dados são da equipe toda. Mantido (decisão minha, ver abaixo).
- Sem editor rich text instalado; `@dnd-kit` já existe; UI usa shadcn/base-ui.
- Migrations no Supabase de produção e fluxo git (branch, nada commitado até Vitor dizer que está 100%) seguem as regras de memória do Vitor.

## Decisões do Vitor
- Visual e comportamento "tudo como o Notion".
- Menu de colar link com 3 opções (link / anotação / embed).
- Notion é a mãe; Biblioteca, Referências e Mapa mental são botões filhos dentro dele.

## Minhas escolhas (Vitor ainda não viu)
- **Editor:** recomendo BlockNote (ProSeMirror/Tiptap pronto, com `/`, arrastar, blocos customizados e variante shadcn) em vez de montar do zero. Builder pode trocar por Tiptap puro se BlockNote não encaixar no shadcn/base-ui do projeto.
- **Dados:** tabela `notion_pages` (id, parent_id nullable → self, title, icon, content jsonb, plain_text para busca, position, favorite, archived_at, created_at, updated_at). Conteúdo da página inteiro em um jsonb, igual `mind_maps.root`. Subpágina = linha com `parent_id`.
- **Busca:** `ILIKE` em title + plain_text. Sem full-text por ora.
- **Anotação de link:** metadados (título/descrição/imagem) buscados no servidor ao colar, reaproveitando `lib/references.ts` (`fetchOgImage`, `resolveReferencePin`); nota própria guardada no bloco.
- **Lixeira:** arquivar (`archived_at`) em vez de apagar; excluir definitivo só pela lixeira.
- **Seção de acesso:** `notion` é uma seção nova restringível; os botões filhos obedecem às seções `biblioteca`, `referencias`, `mapas`.
- **Fora de escopo, mas achado:** `createMindMapAction` redireciona para `/admin/mapas/<id>`, rota inexistente (editor real é `/mapa/editar/<id>`). Provável 404, não verificado. Tratar separado.

- **Conflito de edição:** coluna de versão/`updated_at` comparada no save; se a página mudou em outra aba, avisa e não sobrescreve.
- **Editor, licença:** usar só pacotes MPL do BlockNote (evitar os "XL", GPL/comerciais). Fase 1 começa com um spike curto (blocos custom + React 19 + base-ui) antes de congelar o formato do jsonb.
- **Embed bloqueado:** servidor lê `X-Frame-Options`/`frame-ancestors` ao colar; se bloquear, vira anotação.
- **Árvore:** arquivar página arquiva a subárvore e restaurar traz tudo junto; mover página para dentro de descendente é bloqueado (sem ciclo). Exclusão definitiva só pela lixeira.
- **Escala:** assume centenas de páginas; árvore carregada inteira, `ILIKE`. Paginação/trigram só se passar de milhares.
- **Imagens:** upload para o bucket Supabase já existente (`guide-references`), pasta `notion/`; também aceita URL colada.
- **Migration:** conferir a numeração (`0104` ou próxima livre) no dia de rodar, contra outras branches.

- **Vitor mandou seguir sem responder 3 perguntas; padrões adotados (minha escolha):** (1) itens de Biblioteca/Referências/Mapas NÃO viram páginas; o hub só tem os botões. (2) notas compartilhadas pela equipe com acesso à seção `notion`, sem `owner_id`. (3) artifact = bloco de embed que tenta iframe e cai para cartão com link quando bloqueado.

- **Implementado (05/11/2026), diferenças do desenho:** imagem só por URL colada (upload para o Supabase ficou para depois); mover página é arrastando na árvore pra cima de outra (ou solta no título "Páginas" pra levar à raiz); reordenar irmãs por arrasto não existe, só aninhar.

## Deixado ao builder
Layout exato do hub e da barra lateral de páginas, ícones/emoji de página, regras de arrastar entre níveis, limites de tamanho do jsonb, lista de domínios que bloqueiam iframe, tratamento de conflito de edição em duas abas, testes (vitest já existe).

## Entrega sugerida em fases
1. Tabela + árvore + editor com blocos básicos + autosave.
2. Colar link (3 opções) + bloco de embed/artifact.
3. Hub com botões filhos + item no menu + busca/favoritos/recentes/lixeira.
