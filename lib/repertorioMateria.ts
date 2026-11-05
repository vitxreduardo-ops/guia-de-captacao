import "server-only";

const MINIMO = 600; // abaixo disso é paywall, aviso de cookies ou página vazia
const MAXIMO = 6000; // mantém o contexto do roteiro enxuto

const ENTIDADES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

/**
 * Texto da matéria, ou null quando não deu (erro, paywall, página sem texto).
 * Quem chama cai no resumo do RSS.
 */
export async function textoDaMateria(url: string): Promise<string | null> {
  try {
    if (!/^https?:\/\//i.test(url)) return null;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; TatuRepertorio/1.0)" },
      cache: "no-store",
    });
    if (!res.ok || !/html/i.test(res.headers.get("content-type") ?? "")) return null;
    const html = (await res.text()).replace(/<(script|style|nav|footer|aside|form)\b[\s\S]*?<\/\1>/gi, "");
    // ponytail: pega os <p> do <article> (ou da página toda); sem lib de leitura, serve p/ jornal comum.
    const corpo = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? html;
    const paragrafos = [...corpo.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) =>
        m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&(nbsp|amp|quot|#39|lt|gt);/g, (e) => ENTIDADES[e])
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter((p) => p.length > 40);
    const texto = paragrafos.join("\n\n");
    return texto.length >= MINIMO ? texto.slice(0, MAXIMO) : null;
  } catch {
    return null;
  }
}
