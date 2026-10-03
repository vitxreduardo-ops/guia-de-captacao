import { monthWeeks } from "@/lib/editorialMonths";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/**
 * O mês em grade, com um ponto por postagem agendada no dia. Só mostra; a
 * lista de postagens e de ideias fica logo abaixo, onde o texto cabe.
 */
export function MonthGrid({
  year,
  month,
  postDates,
  today,
}: {
  year: number;
  month: number;
  /** `YYYY-MM-DD` de cada postagem (repetido = mais de uma no dia). */
  postDates: string[];
  today: string;
}) {
  const counts = new Map<number, number>();
  for (const d of postDates) {
    if (d.startsWith(`${year}-${String(month).padStart(2, "0")}-`)) {
      const day = Number(d.slice(8, 10));
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }

  return (
    <table className="w-full table-fixed border-separate border-spacing-y-1 text-center">
      <caption className="sr-only">Calendário do mês, com dias que têm postagens marcados</caption>
      <thead>
        <tr>
          {WEEKDAYS.map((d, i) => (
            <th key={i} scope="col" className="pb-1 text-xs font-medium text-[var(--tatu-muted)]">
              <span aria-hidden>{d}</span>
              <span className="sr-only">{WEEKDAY_NAMES[i]}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(year, month).map((week, w) => (
          <tr key={w}>
            {week.map((day, i) => {
              const n = day ? counts.get(day) ?? 0 : 0;
              const iso = day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const isToday = iso === today;
              return (
                <td key={i} className="h-11 align-top">
                  {day ? (
                    <div
                      className={`mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-sm ${
                        isToday
                          ? "bg-[var(--tatu-ink)] font-semibold text-[var(--tatu-cream)]"
                          : n
                            ? "bg-[var(--tatu-taupe)]/50 font-semibold"
                            : ""
                      }`}
                    >
                      <span>{day}</span>
                      {n ? (
                        <span className="sr-only">{n === 1 ? "1 postagem" : `${n} postagens`}</span>
                      ) : null}
                      {n ? (
                        <span
                          aria-hidden
                          className={`-mt-0.5 h-1 w-1 rounded-full ${isToday ? "bg-[var(--tatu-cream)]" : "bg-[var(--tatu-olive)]"}`}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
