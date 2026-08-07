# Guia de Captação

App interno para montar **guias de gravação** por projeto/cliente — roteiros,
referências visuais, shot list e checklist de equipamento/locação — e gerar
para cada um um **link público** (compartilhável com o cliente) e um **PDF**.

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar um projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) — cria as tabelas `guides`, `videos`, `scenes`, `visual_references`, `shot_list_items` e `checklist_items`.
   - Se você já tinha rodado uma versão anterior deste schema (sem a tabela `videos`), rode em vez disso [`supabase/migrations/0002_add_videos.sql`](supabase/migrations/0002_add_videos.sql) — preserva os guias e cenas já criados.
3. Em **Storage**, crie um bucket público chamado `guide-references` (usado para as imagens de referência visual enviadas por upload).
4. Em **Project Settings > API**, copie a **Project URL** e a **service_role key**.

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp .env.local.example .env.local
```

- `ADMIN_PASSWORD`: senha única para acessar a área `/admin` (não há contas de usuário separadas).
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: do passo anterior. A service role key só é usada em código server-side (nunca é exposta ao navegador) — por isso as tabelas têm Row Level Security habilitado sem policies (a service role ignora RLS).

### 4. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000/admin](http://localhost:3000/admin) e entre com a senha configurada.

## Como funciona

- **`/admin`** — lista de guias, criação de novos guias.
- **`/admin/guias/[id]`** — formulário de edição: dados gerais, vídeos (cada vídeo pode ter várias cenas, cada cena com roteiro e referências visuais próprias — upload de arquivo ou link de imagem), shot list/decupagem e checklist de equipamento/locação. Um botão publica o guia.
- **`/guia/[slug]`** — página pública, somente leitura, visível para qualquer pessoa com o link assim que o guia é publicado.
- **`/api/guias/[slug]/pdf`** — gera e retorna um PDF com o mesmo conteúdo do guia (via [`@react-pdf/renderer`](https://react-pdf.org/)).

## Deploy (Vercel)

1. Suba o repositório para o GitHub/GitLab e importe o projeto na [Vercel](https://vercel.com/new).
2. Configure as mesmas variáveis de ambiente (`ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) no painel do projeto na Vercel.
3. Deploy.
