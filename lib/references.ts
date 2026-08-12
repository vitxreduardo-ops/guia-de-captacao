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

export function isLikelyImageUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const lower = pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  } catch {
    return false;
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
