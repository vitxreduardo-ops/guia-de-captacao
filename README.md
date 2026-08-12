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
   - Se seu banco já tem a tabela `videos` mas ainda não tem `visual_references.source_url`, rode [`supabase/migrations/0004_add_reference_source_url.sql`](supabase/migrations/0004_add_reference_source_url.sql).
   - Se seu banco ainda não tem `scenes.recorded`, rode [`supabase/migrations/0005_add_scene_recorded.sql`](supabase/migrations/0005_add_scene_recorded.sql) — usado pelo checklist de "cena gravada" na página pública.
   - Se seu banco ainda não tem as tabelas `photo_items`/`card_items`, rode [`supabase/migrations/0006_add_photos_and_cards.sql`](supabase/migrations/0006_add_photos_and_cards.sql) — usadas pelos painéis "Fotos" e "Cards".
   - Se seu banco ainda não tem as tabelas `gallery_clients`/`gallery_images`, rode [`supabase/migrations/0016_add_gallery_clients.sql`](supabase/migrations/0016_add_gallery_clients.sql) — usadas pela "Galeria do cliente".
   - Se seu banco já tem `gallery_clients`/`gallery_images` mas ainda não tem `google_oauth_tokens`/`drive_folder_id`/`drive_file_id`, rode [`supabase/migrations/0017_add_google_drive_oauth.sql`](supabase/migrations/0017_add_google_drive_oauth.sql) — usada pela sincronização com pasta do Google Drive.
   - Se seu banco ainda não tem `gallery_images.mime_type`/`drive_relative_path`, rode [`supabase/migrations/0018_add_gallery_image_mime_type.sql`](supabase/migrations/0018_add_gallery_image_mime_type.sql) — a sincronização com o Drive passou a trazer vídeos além de fotos, e a agrupar por subpasta.
3. Em **Storage**, crie um bucket público chamado `guide-references` (usado para as imagens de referência visual enviadas por upload).
4. Em **Project Settings > API**, copie a **Project URL** e a **service_role key**.

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp .env.local.example .env.local
```

- `ADMIN_PASSWORD`: segredo do servidor usado só pra assinar o cookie de sessão (não é mais "a senha" de ninguém — o acesso agora é por conta individual, ver abaixo). Qualquer valor longo e aleatório serve.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: do passo anterior. A service role key só é usada em código server-side (nunca é exposta ao navegador) — por isso as tabelas têm Row Level Security habilitado sem policies (a service role ignora RLS).

### 4. Criar o primeiro usuário admin

A tabela `users` guarda contas com usuário + senha (hash PBKDF2, ver [`lib/users.ts`](lib/users.ts)) e uma `role` (`admin` ou `member`). Como não existe tela de cadastro pública, o primeiro admin precisa ser inserido direto no banco. Gere o hash localmente:

```bash
node -e "
const c = require('crypto').webcrypto;
const hex = b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
(async () => {
  const salt = c.getRandomValues(new Uint8Array(16));
  const key = await c.subtle.importKey('raw', new TextEncoder().encode('SUA_SENHA_AQUI'), 'PBKDF2', false, ['deriveBits']);
  const bits = await c.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  console.log('100000:' + hex(salt.buffer) + ':' + hex(bits));
})();
"
```

E rode no SQL Editor do Supabase:

```sql
insert into users (username, password_hash, role)
values ('seu_usuario', 'COLE_O_HASH_AQUI', 'admin');
```

Admins podem criar outros usuários (admin ou membro) pela própria interface, em `/admin/usuarios`. Membros têm acesso igual ao admin em guias, orçamentos e biblioteca — só não gerenciam usuários.

### 5. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000/admin](http://localhost:3000/admin) e entre com o usuário/senha criados no passo anterior.

## Como funciona

- **`/admin`** — hub com acesso a Guias, Orçamentos, Biblioteca, Galeria do cliente e (só para admins) Usuários.
- **`/admin/usuarios`** — admin cria/remove contas e define a role (`admin` ou `member`).
- **`/admin/guias/[id]`** — formulário de edição: dados gerais, vídeos (cada vídeo pode ter várias cenas, cada cena com roteiro e referências visuais próprias — upload de arquivo ou link de imagem), painéis **Fotos** e **Cards** (listas de imagens embedadas no nível do guia, ex: links do Pinterest ou cosmos.so), shot list/decupagem e checklist de equipamento/locação. Um botão publica o guia.
  - Se o link colado numa referência visual (de cena, Fotos ou Cards) não for uma imagem direta (ex: post do Instagram/Pinterest), o sistema tenta extrair a imagem de capa (`og:image`) automaticamente e mostra ela como referência, guardando o link original para abrir a publicação de origem. Se não conseguir extrair, mostra como um link clicável simples.
  - Os painéis Fotos e Cards só aparecem na página pública e no PDF quando têm pelo menos um item adicionado.
- **`/guia/[slug]`** — página pública, visível para qualquer pessoa com o link assim que o guia é publicado. Os blocos de vídeo começam minimizados (só um aberto por vez). Cada cena tem um botão "Gravar": ao marcar, a cena fica verde; quando todas as cenas de um vídeo são marcadas, o bloco minimiza sozinho e ganha um ✓ ao lado do título. Não exige login, então qualquer pessoa com o link pode marcar/desmarcar.
- **`/api/guias/[slug]/pdf`** — gera e retorna um PDF com o mesmo conteúdo do guia (via [`@react-pdf/renderer`](https://react-pdf.org/)).
- **`/admin/galerias`** — cadastro de clientes; cada cliente tem sua própria página em `/admin/galerias/[id]` com duas formas de adicionar fotos e um botão de publicar.
  - **`/galeria/[slug]`** — página pública da galeria de um cliente específico, visível assim que publicada.
  - **Sincronizar pasta do Drive** (recomendado): em `/admin/galerias`, conecte uma conta Google uma vez ("Conectar Google Drive"). Depois, em cada cliente, cole o link da pasta do Drive dele (a pasta precisa estar compartilhada, ao menos como visualizador, com a conta Google conectada) e clique em "Sincronizar fotos" — o app varre a pasta **recursivamente** (incluindo subpastas), traz fotos e vídeos, e os serve via um proxy próprio (`/api/drive-image/[fileId]`, com suporte a Range requests pra vídeo tocar sem baixar o arquivo inteiro), sem expor tokens nem exigir que a pasta seja pública. A galeria mostra os itens **agrupados por subpasta** (itens soltos na raiz aparecem sem cabeçalho). Sincronizar de novo substitui as fotos/vídeos vindos do Drive pelo estado atual da pasta.
  - **Colar link manualmente**: ainda funciona pra fotos avulsas — link de imagem direta, link de um arquivo individual do Drive compartilhado como "Qualquer pessoa com o link" (convertido automaticamente pro endpoint de thumbnail do Drive), ou posts do Pinterest/Instagram (via `og:image`).
  - Ver configuração da conta Google em [`.env.local.example`](.env.local.example) (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`) — precisa de um OAuth Client ID tipo "Web application" no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) com a Google Drive API ativada.

## Deploy (Vercel)

1. Suba o repositório para o GitHub/GitLab e importe o projeto na [Vercel](https://vercel.com/new).
2. Configure as mesmas variáveis de ambiente (`ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) no painel do projeto na Vercel.
3. Deploy.
