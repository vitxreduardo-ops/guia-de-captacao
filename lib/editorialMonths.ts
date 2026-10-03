// Sem "server-only": a lógica pura é usada pelas páginas e pelos testes.

export interface EditorialIdea {
  id: string;
  /** Sempre o dia 1 do mês, `YYYY-MM-01`. */
  month: string;
  title: string;
  notes: string;
  internal: boolean;
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
