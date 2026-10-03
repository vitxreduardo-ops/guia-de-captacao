// Sem "server-only": a lógica pura é usada pelas páginas e pelos testes.

export interface EditorialIdea {
  id: string;
  /** Sempre o dia 1 do mês, `YYYY-MM-01`. */
  month: string;
  title: string;
  notes: string;
  internal: boolean;
  /** Quem anotou. Ideias antigas não têm autor. */
  created_by_name?: string | null;
  created_by_role?: "admin" | "member" | "client" | null;
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** 12 listas, índice 0 = janeiro, na ordem em que as ideias chegaram. */
export function groupByMonth(ideas: EditorialIdea[]): EditorialIdea[][] {
  const months: EditorialIdea[][] = Array.from({ length: 12 }, () => []);
  for (const idea of ideas) {
    const index = Number(idea.month.slice(5, 7)) - 1;
    if (index >= 0 && index < 12) months[index].push(idea);
  }
  return months;
}

/** "Galeria do 14Bis", "Galeria da Dra. Juliana". */
export function galleryTitle(name: string, article: "do" | "da"): string {
  return `Galeria ${article} ${name}`;
}

/** Os próximos `count` meses a partir de `from`, como `{year, month(1-12)}`. */
export function nextMonths(from: Date, count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

/** "2 materiais esperando seu OK" — texto humano pro resumo da home. */
export function pendingSummary(pending: number, changes: number): string | null {
  const parts: string[] = [];
  if (pending > 0)
    parts.push(
      pending === 1 ? "1 material esperando seu OK" : `${pending} materiais esperando seu OK`
    );
  if (changes > 0)
    parts.push(changes === 1 ? "1 em ajuste" : `${changes} em ajuste`);
  return parts.length ? parts.join(" · ") : null;
}

// Pares fundo/texto com contraste AA entre si, todos no tom quente da marca.
const CREATOR_COLORS = ["#2f3b1e", "#6b6a3f", "#8a4b2d", "#4a5d73", "#7a5c1e", "#5b3f6b"];

/** A mesma pessoa tem sempre a mesma cor, em qualquer tela. */
export function creatorColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CREATOR_COLORS[hash % CREATOR_COLORS.length];
}

/** "Drive do 14Bis" / "Drive da Dra. Juliana". */
export function driveTitle(name: string, article: "do" | "da"): string {
  return `Drive ${article} ${name}`;
}

/** Dias do mês em linhas de 7 (domingo primeiro); null = célula vazia. */
export function monthWeeks(year: number, month: number): (number | null)[][] {
  const lead = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
