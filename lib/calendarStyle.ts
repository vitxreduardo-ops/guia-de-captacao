/**
 * A cara comum dos calendários: cada dia é um ladrilho arredondado com folga
 * entre eles, dia que já passou fica apagado e hoje vai cheio de oliva.
 *
 * São só classes, não um componente: cada calendário (Backlog e Entregas,
 * Agenda de mês e de semana, portal e área do cliente) põe uma coisa
 * diferente dentro do dia, mas o desenho do dia é o mesmo em todos.
 */

/** O cartão branco que segura o calendário inteiro. */
export const calCard =
  "rounded-3xl bg-white p-2 shadow-sm ring-1 ring-neutral-200/70 sm:p-4";

/** Rótulo do dia da semana em cima da grade (DOM, SEG…). */
export const calWeekday =
  "text-center text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-neutral-500";

/** Botão redondo de mês/semana anterior e seguinte. */
export const calNavButton =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none";

/** Etiqueta da legenda (Postagem, Gravação…), cor de fundo vem de fora. */
export const calLegendPill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium";

type DayState = { today?: boolean; past?: boolean; outside?: boolean };

/** O ladrilho do dia: só fundo e forma, o conteúdo de dentro não desbota. */
export function calDayTile({ today, past, outside }: DayState) {
  if (today) return "rounded-2xl bg-olive-600 shadow-lg shadow-olive-600/25";
  if (outside) return "rounded-2xl bg-neutral-50/70";
  if (past) return "rounded-2xl bg-neutral-50";
  return "rounded-2xl bg-neutral-100";
}

/** O número do dia: hoje vira uma pílula branca sobre o oliva. */
export function calDayNumber({ today, past, outside }: DayState) {
  if (today)
    return "inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-olive-700 tabular-nums";
  if (outside) return "text-xs font-medium text-neutral-300 tabular-nums";
  if (past) return "text-xs font-medium text-neutral-400 tabular-nums";
  return "text-xs font-semibold text-neutral-900 tabular-nums";
}
