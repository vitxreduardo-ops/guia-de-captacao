// Chave pra saber se dois links são o mesmo: tira o que não muda o destino
// (rastreio, âncora, barra final, www, caixa do domínio). Puro, sem rede.

const TRACKING = /^(utm_|fbclid$|igsh$|igshid$|gclid$|si$|ref$|feature$)/i;

export function urlKey(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  const params = [...url.searchParams.entries()]
    .filter(([k]) => !TRACKING.test(k))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.map(([k, v]) => `${k}=${v}`).join("&");
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.hostname.toLowerCase().replace(/^www\./, "")}${path}${query ? `?${query}` : ""}`;
}

/** Primeiro http(s) solto no meio de um texto, sem pontuação colada no fim. */
export function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[).,;!?]+$/, "") : null;
}
