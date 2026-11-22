// Pasta de dentro do app que já ocupa a raiz do domínio: um slug igual a uma
// delas nunca seria alcançado (rota estática ganha da dinâmica).
const RESERVADOS = new Set([
  "admin", "api", "apple-icon", "briefing", "cliente", "conectar-instagram",
  "contrato", "convite", "galeria", "guia", "icon", "login", "manifest", "mapa",
  "opengraph-image", "orcamento", "planejamento", "robots", "signup", "site",
  "sitemap", "splash", "teste-lettering", "sistema", "www",
]);

const SLUG = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"; // sem i, l, o, 0, 1

export function slugValido(slug: string): boolean {
  return SLUG.test(slug) && !RESERVADOS.has(slug);
}

export function urlValida(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function slugAleatorio(tamanho = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

// Quem abre o link sem ser uma pessoa: prévia do WhatsApp/iMessage/Telegram,
// buscadores, verificadores. Sem este filtro, cada envio contaria como clique.
const ROBO = /bot|crawler|spider|preview|whatsapp|facebookexternalhit|slurp|discord|skypeuripreview|headlesschrome|curl|wget/i;

export function ehRobo(userAgent: string): boolean {
  return !userAgent || ROBO.test(userAgent);
}

export function aparelhoDoUserAgent(userAgent: string): "celular" | "tablet" | "computador" {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "celular";
  return "computador";
}

/** "2026-12-31" → último instante desse dia em Brasília (sem horário de verão desde 2019). */
export function fimDoDia(dia: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const d = new Date(`${dia}T23:59:59-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * UTM automático: source/medium fixos e campanha vinda do rótulo. Nunca
 * sobrescreve um utm_* que o link já traga.
 */
export function comUtm(destino: string, campanha: string): string {
  const u = new URL(destino);
  const padrao = { utm_source: "tatu", utm_medium: "link-curto", utm_campaign: campanha };
  for (const [k, v] of Object.entries(padrao)) if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
  return u.toString();
}
