// Sem "server-only": a lógica é pura e roda nos testes.

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * A logo do cliente no acervo (`client_logos`), achada pelo nome: o acervo não
 * aponta pro cadastro, então "14Bis" casa com "14bis" e "IK Odontologia" com
 * "ik  odontologia". Sem logo no acervo, devolve null e a tela usa a inicial.
 */
export function findClientLogo(
  clientName: string,
  logos: { name: string; logo_url: string }[]
): string | null {
  const wanted = normalize(clientName);
  if (!wanted) return null;
  return logos.find((logo) => normalize(logo.name) === wanted)?.logo_url ?? null;
}

/**
 * SVG cujas cores de preenchimento são todas claras (logo feita pra fundo
 * escuro): sobre branco ela some. Sem nenhuma cor declarada, assume escura.
 */
export function svgIsLight(svg: string): boolean {
  const colors = [...svg.matchAll(/(?:fill|stroke)\s*[:=]\s*"?\s*(#[0-9a-f]{3,8}|white)\b/gi)].map(
    (m) => m[1].toLowerCase()
  );
  if (!colors.length) return false;
  return colors.every((c) => {
    if (c === "white") return true;
    const hex = c.length === 4 ? c.slice(1).replace(/./g, "$&$&") : c.slice(1, 7);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.85;
  });
}
