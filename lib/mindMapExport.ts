import { DEFAULT_BOX, isDark, type Layout } from "@/lib/mindMap";

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface ExportTheme {
  bg: string;
  ink: string;
}

/**
 * O mapa como SVG autônomo (nada de CSS externo), pra virar PNG ou PDF.
 * Usa as mesmas posições do layout da tela, então sai igual ao que se vê.
 */
export function toSvg(lay: Layout, theme: ExportTheme): { svg: string; w: number; h: number } {
  const M = 60;
  const { minX, maxX, minY, maxY } = lay.bounds;
  const w = Math.ceil(maxX - minX + M * 2);
  const h = Math.ceil(maxY - minY + M * 2);
  const ox = M - minX;
  const oy = M - minY;

  const edges = lay.edges
    .map((e) => {
      const [x1, y1] = e.from;
      const [x2, y2] = e.to;
      const mx = (x1 + x2) / 2;
      return `<path d="M ${x1 + ox} ${y1 + oy} C ${mx + ox} ${y1 + oy}, ${mx + ox} ${y2 + oy}, ${x2 + ox} ${y2 + oy}" stroke="${e.color}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    })
    .join("");

  const nodes = lay.items
    .map((p) => {
      const root = p.depth === 0;
      const label = `${p.node.icon ? p.node.icon + " " : ""}${p.node.text}`;
      const anchor = root ? "middle" : p.side === -1 ? "end" : "start";
      const boxed = root || p.node.box;
      const pad = boxed && !root ? 14 : 0;
      const tx = root ? p.x + p.w / 2 : p.side === -1 ? p.x + p.w - pad : p.x + pad;
      const fill = p.node.boxColor ?? (root ? theme.ink : DEFAULT_BOX);
      const textFill = boxed ? (isDark(fill) ? "#f5f5f0" : "#2f3b1e") : theme.ink;
      let out = "";
      if (root) {
        out = `<rect x="${p.x + ox}" y="${p.y + oy - 22}" width="${p.w}" height="44" rx="16" fill="${fill}"/>`;
      } else if (boxed) {
        out = `<rect x="${p.x + ox + 1}" y="${p.y + oy - 17}" width="${p.w - 2}" height="34" rx="12" fill="${fill}" stroke="${p.node.boxColor ?? p.color}" stroke-width="2"/>`;
      }
      out += `<text x="${tx + ox}" y="${p.y + oy}" text-anchor="${anchor}" dominant-baseline="central" font-family="Geist, Helvetica, Arial, sans-serif" font-size="${root ? 20 : 16}" font-weight="${root ? 700 : 400}" fill="${textFill}">${esc(root ? label.toUpperCase() : label)}</text>`;
      if (p.ring) {
        const cx = (p.side === 1 ? p.x + p.w + 15 : p.x - 15) + ox;
        out += `<circle cx="${cx}" cy="${p.y + oy}" r="9" fill="${theme.bg}" stroke="${p.color}" stroke-width="3"/>`;
        out += p.node.collapsed
          ? `<text x="${cx}" y="${p.y + oy}" text-anchor="middle" dominant-baseline="central" font-family="Geist, Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="${p.color}">${p.node.children.length}</text>`
          : `<circle cx="${cx}" cy="${p.y + oy}" r="3" fill="${p.color}"/>`;
      }
      return out;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${theme.bg}"/>${edges}${nodes}</svg>`;
  return { svg, w, h };
}

/** SVG → PNG em alta resolução (2x), via canvas do navegador. */
export async function svgToPng(svg: string, w: number, h: number, scale = 2): Promise<string> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}
