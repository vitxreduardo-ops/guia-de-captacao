import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// A mesma conta Google serve o Drive (galerias) e o Google Agenda (backlog),
// então o consentimento pede os dois escopos de uma vez. Quem já conectou
// antes do calendário existir precisa conectar de novo pra liberar o escopo
// novo — o refresh_token antigo não ganha permissões retroativamente.
const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar",
];
const TOKEN_ROW_ID = "default";

function getEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google Drive não configurado: defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI no .env.local"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleAuthUrl(): string {
  const { clientId, redirectUri } = getEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

async function fetchUserEmail(accessToken: string): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return "";
  const data = await response.json();
  return data.email ?? "";
}

/**
 * Troca o código de autorização (callback do OAuth) por tokens e salva o
 * refresh_token no banco. É chamado uma vez, quando o admin conecta a conta
 * Google — depois disso o app renova o access token sozinho.
 */
export async function connectGoogleAccount(code: string): Promise<void> {
  const { clientId, clientSecret, redirectUri } = getEnv();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao trocar código OAuth por tokens: ${await response.text()}`);
  }

  const tokens: GoogleTokenResponse = await response.json();
  if (!tokens.refresh_token) {
    throw new Error(
      "Google não retornou refresh_token — revogue o acesso do app em myaccount.google.com/permissions e conecte de novo (isso força a tela de consentimento a reaparecer)."
    );
  }

  const email = await fetchUserEmail(tokens.access_token);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("google_oauth_tokens").upsert({
    id: TOKEN_ROW_ID,
    refresh_token: tokens.refresh_token,
    email,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  clearCachedAccessToken();
}

export async function getConnectedGoogleAccount(): Promise<{
  email: string;
} | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .select("email")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? { email: data.email } : null;
}

export async function disconnectGoogleAccount(): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("google_oauth_tokens")
    .delete()
    .eq("id", TOKEN_ROW_ID);
  if (error) throw error;
  clearCachedAccessToken();
}

/**
 * Troca o refresh_token salvo por um access_token novo (eles expiram em
 * ~1h). Chamado a cada operação que fala com a Drive API — sem cache, já
 * que essas operações são pouco frequentes (sync manual, carregar imagem).
 */
// O access token do Google vale cerca de uma hora, então renovar a cada
// chamada é desperdício puro: abrir uma galeria dispara uma requisição por
// miniatura, e cada uma pagava uma leitura no Supabase mais um refresh no
// Google antes de chegar no arquivo. Guarda o token em memória até perto de
// expirar e faz as chamadas simultâneas dividirem um único refresh (senão as
// dezenas de miniaturas que carregam juntas renovariam todas de uma vez).
let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let accessTokenInFlight: Promise<string> | null = null;
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

async function requestAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getEnv();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .select("refresh_token")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Nenhuma conta Google conectada.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: data.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao renovar acesso ao Google Drive: ${await response.text()}`);
  }

  const tokens: GoogleTokenResponse = await response.json();
  cachedAccessToken = {
    token: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000 - TOKEN_EXPIRY_MARGIN_MS,
  };
  return tokens.access_token;
}

/** Access token válido da conta Google conectada. Exportado porque o
 * módulo do Google Agenda (`lib/googleCalendar.ts`) usa a mesma conta e o
 * mesmo cache de token. */
export async function getFreshAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }
  if (accessTokenInFlight) return accessTokenInFlight;

  accessTokenInFlight = requestAccessToken().finally(() => {
    accessTokenInFlight = null;
  });
  return accessTokenInFlight;
}

/** Descarta o token em cache — chamado ao conectar ou desconectar a conta,
 * pra não seguir usando um acesso que não vale mais. */
function clearCachedAccessToken() {
  cachedAccessToken = null;
  accessTokenInFlight = null;
}

const FOLDER_ID_PATTERNS = [
  /\/folders\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/drive/folders/ID
  /[?&]id=([a-zA-Z0-9_-]+)/, // https://drive.google.com/open?id=ID
];

export function extractDriveFolderId(url: string): string | null {
  for (const pattern of FOLDER_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export interface DriveMediaFile {
  id: string;
  name: string;
  mimeType: string;
  /** Caminho da subpasta de origem, relativo à pasta sincronizada (ex:
   * "Fotos/Making of"), ou "" se o arquivo está solto na raiz. */
  relativePath: string;
  /** Data de modificação do arquivo no Drive (ISO), pra ordenação por data. */
  modifiedTime: string | null;
}

const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const MAX_FOLDER_DEPTH = 8;

// Formatos que o navegador consegue abrir direto num <img>/<video>. RAW de
// câmera (image/x-sony-arw, ...) e PSD (image/vnd.adobe.photoshop) não
// entram aqui — o Drive os classifica como "imagem", mas nenhum navegador
// os renderiza, então nem entram na sincronização.
const RENDERABLE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/avif",
]);
const RENDERABLE_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

export function isRenderableMediaMimeType(mimeType: string): boolean {
  return (
    RENDERABLE_IMAGE_MIME_TYPES.has(mimeType) ||
    RENDERABLE_VIDEO_MIME_TYPES.has(mimeType)
  );
}

interface DriveChild {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

async function listFolderChildren(
  folderId: string,
  accessToken: string
): Promise<DriveChild[]> {
  const children: DriveChild[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
      pageSize: "1000",
      orderBy: "folder, name",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error(`Falha ao listar arquivos do Drive: ${await response.text()}`);
    }

    const data = await response.json();
    children.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return children;
}

/**
 * Lista todas as fotos e vídeos dentro de uma pasta do Drive, incluindo
 * subpastas (recursivo). Usa a conta Google conectada. Cada arquivo carrega
 * o caminho da subpasta de origem, pra galeria agrupar por subpasta.
 */
export async function listDriveFolderMediaRecursive(
  rootFolderId: string
): Promise<DriveMediaFile[]> {
  const accessToken = await getFreshAccessToken();
  const files: DriveMediaFile[] = [];
  const queue: { folderId: string; path: string; depth: number }[] = [
    { folderId: rootFolderId, path: "", depth: 0 },
  ];

  while (queue.length > 0) {
    const { folderId, path, depth } = queue.shift()!;
    const children = await listFolderChildren(folderId, accessToken);

    for (const child of children) {
      if (child.mimeType === DRIVE_FOLDER_MIME_TYPE) {
        if (depth >= MAX_FOLDER_DEPTH) continue;
        queue.push({
          folderId: child.id,
          path: path ? `${path}/${child.name}` : child.name,
          depth: depth + 1,
        });
        continue;
      }

      if (isRenderableMediaMimeType(child.mimeType)) {
        files.push({
          id: child.id,
          name: child.name,
          mimeType: child.mimeType,
          relativePath: path,
          modifiedTime: child.modifiedTime ?? null,
        });
      }
    }
  }

  return files;
}

/**
 * Busca os bytes de um arquivo do Drive pra servir via proxy (a página
 * pública nunca fala com o Drive diretamente — não tem token nem sessão
 * Google). Repassa o header Range (pra vídeos tocarem com suporte a pular
 * trechos, sem baixar o arquivo inteiro antes). Retorna null se o arquivo
 * não existir/for inacessível.
 */
export async function fetchDriveFileBytes(
  fileId: string,
  range?: string | null,
  /** Cancelamento vindo do cliente. O player abandona requisições o tempo
   * todo (abre o vídeo, pula pra outro trecho, fecha o modal) e sem repassar
   * isso o download seguia rodando aqui, segurando uma conexão com o Google
   * que ninguém ia consumir. Poucas aberturas bastavam pra esgotar o pool e
   * as requisições seguintes começarem a estourar por timeout de conexão. */
  signal?: AbortSignal
): Promise<{
  body: ReadableStream<Uint8Array>;
  status: number;
  contentType: string;
  contentRange: string | null;
  contentLength: string | null;
} | null> {
  const accessToken = await getFreshAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (range) headers.Range = range;

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers, signal }
  );

  if (!response.body || (!response.ok && response.status !== 206)) return null;

  return {
    body: response.body,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    contentRange: response.headers.get("content-range"),
    contentLength: response.headers.get("content-length"),
  };
}

/**
 * Busca a miniatura otimizada que o próprio Drive já gera pra cada arquivo
 * (`thumbnailLink`) — usada como preview leve na galeria (grid pequeno) e
 * também como versão "grande" pra abrir em tela cheia (`size` maior, ex:
 * 1600px), bem mais rápida e leve que buscar o arquivo original inteiro só
 * pra exibir na tela. Retorna null se o Drive não tiver gerado miniatura
 * pra esse arquivo.
 */
export async function fetchDriveThumbnailBytes(
  fileId: string,
  size?: number
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const accessToken = await getFreshAccessToken();
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  const metaResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink`,
    { headers: authHeader }
  );
  if (!metaResponse.ok) return null;

  const meta = await metaResponse.json();
  if (!meta.thumbnailLink) return null;

  // thumbnailLink vem com um tamanho pequeno por padrão (ex: "...=s220").
  // Troca o sufixo de tamanho pra pedir uma versão maior quando informado —
  // o Drive aceita e devolve o maior tamanho que tiver gerado, sem erro.
  const thumbnailLink = size
    ? /=s\d+$/.test(meta.thumbnailLink)
      ? meta.thumbnailLink.replace(/=s\d+$/, `=s${size}`)
      : `${meta.thumbnailLink}=s${size}`
    : meta.thumbnailLink;

  const thumbResponse = await fetch(thumbnailLink, { headers: authHeader });
  if (!thumbResponse.ok || !thumbResponse.body) return null;

  return {
    body: thumbResponse.body,
    contentType: thumbResponse.headers.get("content-type") ?? "image/jpeg",
  };
}
