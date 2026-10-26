// Leitor de feed RSS 2.0 e Atom do Repertório (/admin/repertorio).
//
// Sem dependência de parser XML de propósito: o Repertório só precisa de
// título, link, data e resumo de cada item, e feed de portal de notícia é
// XML simples o bastante para isso. Feed que não for RSS/Atom (uma página
// HTML colada por engano) volta lista vazia, e a coleta avisa na fonte.
//
// Só o resumo é guardado, cortado: a matéria inteira fica no site de origem.

export type ItemFeed = {
  titulo: string;
  url: string;
  resumo: string;
  /** ISO 8601, ou null quando o feed não traz data legível. */
  publicadoEm: string | null;
};

/** Tamanho máximo do resumo guardado, em caracteres. */
export const MAX_RESUMO = 400;

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
};

export function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (original, codigo: string) => {
    if (codigo[0] === "#") {
      const hexa = codigo[1].toLowerCase() === "x";
      const n = parseInt(codigo.slice(hexa ? 2 : 1), hexa ? 16 : 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : original;
    }
    return ENTIDADES[codigo.toLowerCase()] ?? original;
  });
}

const desembrulharCdata = (texto: string) =>
  texto.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

/** HTML do resumo vira texto corrido: o feed manda `<p>`, `<img>`, `<a>`. */
function textoLimpo(bruto: string): string {
  let texto = decodificarEntidades(desembrulharCdata(bruto));
  texto = texto
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  // Segunda passada: alguns feeds escapam duas vezes (`&amp;nbsp;`).
  return decodificarEntidades(texto).replace(/\s+/g, " ").trim();
}

const escapar = (nome: string) => nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Conteúdo da primeira tag com um destes nomes. O lookahead garante o nome
 * exato: procurar `title` não pode casar com `media:title`.
 */
function campo(bloco: string, nomes: string[]): string | null {
  for (const nome of nomes) {
    const tag = escapar(nome);
    const achado = new RegExp(`<${tag}(?=[\\s>])[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(bloco);
    if (achado && achado[1].trim()) return achado[1];
  }
  return null;
}

/**
 * Tira parâmetros de campanha e âncora: o mesmo link com `utm_source`
 * diferente seria outra notícia no banco, e a mesma matéria entraria duas vezes.
 */
export function limparUrl(endereco: string): string | null {
  let url: URL;
  try {
    url = new URL(endereco.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  for (const chave of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(chave)) url.searchParams.delete(chave);
  }
  url.hash = "";
  return url.toString();
}

function linkDoItem(bloco: string): string | null {
  // RSS: <link>https://…</link>
  const rss = campo(bloco, ["link"]);
  if (rss) {
    const url = limparUrl(textoLimpo(rss));
    if (url) return url;
  }
  // Atom: <link rel="alternate" href="…"/> (sem rel também é alternate).
  const links = bloco.match(/<link\b[^>]*>/gi) ?? [];
  for (const link of links) {
    const rel = /\brel=["']([^"']+)["']/i.exec(link)?.[1];
    const href = /\bhref=["']([^"']+)["']/i.exec(link)?.[1];
    if (href && (!rel || rel === "alternate")) {
      const url = limparUrl(decodificarEntidades(href));
      if (url) return url;
    }
  }
  // Último recurso: guid que é link permanente.
  const guid = /<guid\b([^>]*)>([\s\S]*?)<\/guid>/i.exec(bloco);
  if (guid && !/isPermaLink=["']false["']/i.test(guid[1])) {
    return limparUrl(textoLimpo(guid[2]));
  }
  return null;
}

const MESES_PT: Record<string, string> = {
  jan: "Jan", fev: "Feb", mar: "Mar", abr: "Apr", mai: "May", jun: "Jun",
  jul: "Jul", ago: "Aug", set: "Sep", out: "Oct", nov: "Nov", dez: "Dec",
};

/**
 * Data do RFC 822 (`Mon, 26 Oct 2026 09:03:39 +0000`) ou ISO. Feed brasileiro
 * às vezes escreve o mês em português (`seg, 26 out 2026`): traduz e tenta de
 * novo. Sem data legível, null; a notícia entra mesmo assim, pela hora da coleta.
 */
export function lerData(bruto: string | null): string | null {
  if (!bruto) return null;
  const texto = textoLimpo(bruto);
  let data = new Date(texto);
  if (Number.isNaN(data.getTime())) {
    const traduzido = texto
      .replace(/^[^\d,]*,\s*/, "")
      .replace(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?/i, (m, mes: string) =>
        MESES_PT[mes.toLowerCase()] ?? m
      );
    data = new Date(traduzido);
  }
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

/** Corta na última palavra inteira antes do limite. */
export function cortar(texto: string, max = MAX_RESUMO): string {
  if (texto.length <= max) return texto;
  const corte = texto.slice(0, max);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,.;:–—-]+$/, "")}…`;
}

export function parseFeed(xml: string): ItemFeed[] {
  const blocos =
    xml.match(/<item(?=[\s>])[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry(?=[\s>])[\s\S]*?<\/entry>/gi) ??
    [];

  const itens: ItemFeed[] = [];
  const vistos = new Set<string>();
  for (const bloco of blocos) {
    const titulo = textoLimpo(campo(bloco, ["title"]) ?? "");
    const url = linkDoItem(bloco);
    if (!titulo || !url || vistos.has(url)) continue;
    vistos.add(url);

    const resumoBruto = campo(bloco, ["description", "summary", "content", "content:encoded"]);
    itens.push({
      titulo,
      url,
      resumo: cortar(resumoBruto ? textoLimpo(resumoBruto) : ""),
      publicadoEm: lerData(campo(bloco, ["pubDate", "dc:date", "published", "updated"])),
    });
  }
  return itens;
}

/**
 * Endereço que o servidor pode buscar. A coleta roda no servidor com o
 * endereço que alguém da equipe digitou: barra rede interna para um erro de
 * digitação (ou um login vazado) não virar requisição pra dentro da Vercel.
 */
export function feedPermitido(endereco: string): boolean {
  let url: URL;
  try {
    url = new URL(endereco.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") || host === "localhost") return false;
  if (/\.(local|internal|localhost)$/.test(host)) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  if (host.includes(":")) return false; // IPv6 literal: nenhum feed de portal usa
  return true;
}
