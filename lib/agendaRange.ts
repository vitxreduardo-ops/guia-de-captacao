/**
 * Contas de data da tela Minha Agenda.
 *
 * Ficam fora do componente de propósito: são regras (onde a semana começa,
 * quantos dias cada visão mostra, quanto as setas andam) com muitos casos de
 * borda — virada de mês, ano bissexto, fuso — e é onde vale ter teste.
 *
 * Toda data aqui é uma chave `YYYY-MM-DD` interpretada em UTC, nunca um
 * `Date` local: o fuso do servidor não pode decidir em que dia a semana
 * começa.
 */

export type AgendaView = "dia" | "4dias" | "semana" | "mes";

export const AGENDA_VIEWS: AgendaView[] = ["dia", "4dias", "semana", "mes"];

export function isAgendaView(value: string | undefined): value is AgendaView {
  return AGENDA_VIEWS.includes(value as AgendaView);
}

export function isDayKey(value: string | undefined): value is string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");
}

export function addDaysKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function addMonthsKey(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1))
    .toISOString()
    .slice(0, 7);
}

/** Domingo da semana daquele dia — a grade do Google começa no domingo. */
export function weekStartOf(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return addDaysKey(key, -date.getUTCDay());
}

/**
 * Onde a grade começa e quantos dias mostra, por visão.
 *
 * A data do endereço é sempre a "âncora" — o dia em que a pessoa clicou ou
 * para onde navegou. Semana e mês recuam até o domingo que abre o bloco;
 * dia e 4 dias começam nela mesma, como no Google.
 */
export function rangeOf(
  view: AgendaView,
  anchor: string
): { start: string; count: number } {
  if (view === "dia") return { start: anchor, count: 1 };
  if (view === "4dias") return { start: anchor, count: 4 };
  if (view === "semana") return { start: weekStartOf(anchor), count: 7 };
  return { start: weekStartOf(`${anchor.slice(0, 7)}-01`), count: 42 };
}

/** Para onde as setas ‹ › levam em cada visão. */
export function stepOf(
  view: AgendaView,
  anchor: string
): { back: string; next: string } {
  if (view === "mes") {
    const [year, month] = anchor.split("-").map(Number);
    const shift = (amount: number) =>
      new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 10);
    return { back: shift(-1), next: shift(1) };
  }
  const days = view === "dia" ? 1 : view === "4dias" ? 4 : 7;
  return { back: addDaysKey(anchor, -days), next: addDaysKey(anchor, days) };
}

/**
 * O trecho que o mini-calendário marca. Na visão de mês são os dias do mês,
 * e não as seis linhas inteiras — senão as pontas dos meses vizinhos
 * entrariam no destaque.
 */
export function highlightOf(
  view: AgendaView,
  anchor: string
): { start: string; end: string } {
  if (view === "mes") {
    const monthKey = anchor.slice(0, 7);
    return {
      start: `${monthKey}-01`,
      end: addDaysKey(`${addMonthsKey(monthKey, 1)}-01`, -1),
    };
  }
  const { start, count } = rangeOf(view, anchor);
  return { start, end: addDaysKey(start, count - 1) };
}

/** As colunas da grade, já com o número do dia pronto para exibir. */
export function daysOf(
  start: string,
  count: number
): { key: string; day: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const key = addDaysKey(start, index);
    return { key, day: Number(key.slice(8, 10)) };
  });
}
