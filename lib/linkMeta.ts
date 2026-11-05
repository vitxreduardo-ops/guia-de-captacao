// Metadados de um link colado no Notion. Funções puras + um fetch no servidor.
import { embedUrlFor } from "@/lib/references";

export interface LinkMeta {
  url: string;
  title: string;
  description: string;
  image: string;
  /** Endereço que dá pra pôr num iframe; null quando o site não deixa. */
  embedUrl: string | null;
}

/** Barra endereços internos: o servidor não pode ser usado pra espiar a rede local. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") ||
    h === "::1" || /^(fc|fd|fe80)/.test(h) ||
    /^(0|10|127)\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || !h.includes(".") && !h.includes(":")
  );
}

/** O site proíbe iframe? Lê X-Frame-Options e frame-ancestors dos headers. */
export function blocksFraming(headers: Headers): boolean {
  const xfo = (headers.get("x-frame-options") ?? "").toLowerCase();
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return true;
  const csp = headers.get("content-security-policy") ?? "";
  const fa = csp.split(";").map((d) => d.trim()).find((d) => d.toLowerCase().startsWith("frame-ancestors"));
  if (!fa) return false;
  const v = fa.toLowerCase();
  return !(v.includes("*") && !v.includes("*.")) ;
}

const meta = (html: string, key: string) => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
    "i"
  );
  const m = html.match(re);
  return (m?.[1] ?? m?.[2] ?? "").trim();
};

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function parseMeta(html: string, base: string): Pick<LinkMeta, "title" | "description" | "image"> {
  const title = meta(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
  const description = meta(html, "og:description") || meta(html, "description");
  const rawImage = meta(html, "og:image");
  let image = "";
  try { image = rawImage ? new URL(decode(rawImage), base).href : ""; } catch { /* sem imagem */ }
  return { title: decode(title).slice(0, 200), description: decode(description).slice(0, 400), image };
}

export async function fetchLinkMeta(rawUrl: string): Promise<LinkMeta | null> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) return null;

  // Players conhecidos (YouTube, Vimeo...) já têm endereço de embed próprio.
  const known = embedUrlFor(url.href)?.replace("autoplay=1", "autoplay=0") ?? null;
  const base: LinkMeta = { url: url.href, title: "", description: "", image: "", embedUrl: known };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TatuNotion/1.0)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    // Redirecionou pra rede interna? Descarta.
    if (isPrivateHost(new URL(res.url).hostname)) return null;
    const html = (await res.text()).slice(0, 400_000);
    return {
      ...base,
      ...parseMeta(html, res.url),
      embedUrl: known ?? (res.ok && !blocksFraming(res.headers) ? url.href : null),
    };
  } catch {
    return base;
  }
}
