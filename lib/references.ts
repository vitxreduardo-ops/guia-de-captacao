import "server-only";

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
];

const DRIVE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/file/d/ID/view
  /[?&]id=([a-zA-Z0-9_-]+)/, // https://drive.google.com/uc?id=ID or open?id=ID
  /\/d\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/thumbnail/d/ID
];

/**
 * Converte um link de arquivo do Google Drive (compartilhado como "qualquer
 * pessoa com o link pode ver") num link de imagem direta, sem precisar de
 * API/OAuth — usa o endpoint público de thumbnail do Drive. Retorna null se o
 * link não for do Drive ou não tiver um ID de arquivo reconhecível.
 */
export function resolveDriveImageUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    if (!hostname.includes("drive.google.com")) return null;
  } catch {
    return null;
  }

  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2000`;
    }
  }

  return null;
}

// CDNs que servem imagem direta em URLs sem extensão no caminho. Como o
// predicado abaixo só consegue olhar a URL (não faz requisição), esses hosts
// precisam ser reconhecidos pelo nome — senão a imagem vira "Abrir link".
function isKnownImageCdn(hostname: string, pathname: string): boolean {
  if (hostname === "cdn.cosmos.so") return true;
  if (hostname === "drive.google.com") return pathname.startsWith("/thumbnail");
  if (hostname.endsWith(".supabase.co")) {
    return pathname.includes("/storage/v1/object/public/");
  }
  return (
    hostname.endsWith(".fbcdn.net") ||
    hostname.endsWith(".cdninstagram.com") ||
    hostname.endsWith(".pinimg.com")
  );
}

export function isLikelyImageUrl(url: string): boolean {
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    const lower = pathname.toLowerCase();
    if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;

    // Formato na query em vez da extensão: ?format=webp, ?fm=jpg etc.
    for (const value of searchParams.values()) {
      const v = value.toLowerCase();
      if (IMAGE_EXTENSIONS.some((ext) => v === ext.slice(1))) return true;
    }

    return isKnownImageCdn(hostname.toLowerCase(), lower);
  } catch {
    return false;
  }
}

/**
 * O renderizador de PDF (@react-pdf) só decodifica JPEG e PNG — uma imagem
 * WebP/AVIF é descartada em silêncio e o PDF sai sem a referência. Quando o
 * formato vem na query da URL (CDNs como o do Cosmos), dá pra pedir JPEG.
 * URLs com a extensão no caminho não têm conversão possível aqui.
 */
export function toPdfSafeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const format = parsed.searchParams.get("format")?.toLowerCase();
    if (format === "webp" || format === "avif") {
      parsed.searchParams.set("format", "jpeg");
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

const OG_IMAGE_REGEX =
  /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["']/i;

// User-agent do crawler de preview de link do Facebook/Instagram (Meta). Sites
// como o Instagram servem a versão com as meta tags og: preenchidas pra esse
// user-agent especificamente (é assim que o preview de link funciona no
// próprio Facebook/WhatsApp) — um user-agent de navegador comum recebe a
// versão em React sem essas tags preenchidas no servidor.
const CRAWLER_USER_AGENT =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

/**
 * Busca a imagem de capa (og:image) de um link (post do Instagram, Pinterest
 * etc). Retorna null se o link não expõe essa meta tag publicamente ou se a
 * busca falhar — nesses casos o link deve continuar sendo tratado como um
 * link comum.
 */
export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": CRAWLER_USER_AGENT,
        Accept: "text/html",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[fetchOgImage] resposta não-ok para ${url}: status ${response.status}`
      );
      return null;
    }

    const html = await response.text();
    const match = html.match(OG_IMAGE_REGEX);
    const imageUrl = match?.[1] ?? match?.[2];
    if (!imageUrl) {
      console.error(
        `[fetchOgImage] og:image não encontrada em ${url} (html length: ${html.length})`
      );
      return null;
    }

    return imageUrl.replace(/&amp;/g, "&");
  } catch (error) {
    console.error(`[fetchOgImage] erro ao buscar ${url}:`, error);
    return null;
  }
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];

const YOUTUBE_ID_PATTERNS = [
  /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
  /[?&]v=([a-zA-Z0-9_-]{6,})/,
  /\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{6,})/,
];

/**
 * ID do vídeo do YouTube na URL, ou null. Serve pra montar a capa sem pedir
 * nada à API: o endereço do thumbnail é previsível a partir do ID.
 */
export function youtubeVideoId(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "youtu.be" && host !== "m.youtube.com") {
      return null;
    }
    for (const pattern of YOUTUBE_ID_PATTERNS) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

/** Arquivo de vídeo servido direto, que dá pra tocar numa tag `<video>`. */
export function isLikelyVideoUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
}

export type ReferenceKind = "image" | "video" | "link";

/**
 * Decide, na hora de salvar, o que um link colado é e qual capa mostrar — o
 * mural só lê esses dois campos depois, sem reinspecionar URL a cada render.
 *
 * Nenhum arquivo é hospedado: a capa é sempre um endereço do próprio site de
 * origem. Para YouTube ela é previsível; para o resto vem da og:image, que em
 * Instagram e Facebook é assinada e um dia expira — quando isso acontece o
 * card cai no favicon do domínio e a capa pode ser reapontada à mão.
 */
export async function resolveReferencePin(
  url: string
): Promise<{ kind: ReferenceKind; thumb_url: string }> {
  if (isLikelyImageUrl(url)) return { kind: "image", thumb_url: url };

  const drive = resolveDriveImageUrl(url);
  if (drive) return { kind: "image", thumb_url: drive };

  if (isLikelyVideoUrl(url)) return { kind: "video", thumb_url: "" };

  const youtubeId = youtubeVideoId(url);
  if (youtubeId) {
    return {
      kind: "video",
      thumb_url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const ogImage = await fetchOgImage(url);
  return { kind: "link", thumb_url: ogImage ?? "" };
}
