import { calCard, calDayNumber, calDayTile, calWeekday } from "@/lib/calendarStyle";
import { monthWeeks } from "@/lib/editorialMonths";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
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
    <div className={`${calCard} mx-auto w-full max-w-md`}>
      <table className="w-full table-fixed border-separate border-spacing-1 text-center">
        <caption className="sr-only">Calendário do mês, com dias que têm postagens marcados</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((d, i) => (
              <th key={i} scope="col" className={`pb-1 ${calWeekday}`}>
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
                const state = { today: iso === today, past: iso < today };
                return (
                  <td key={i} className="h-12 p-0 align-top">
                    {day ? (
                      <div className={`flex h-12 flex-col items-start justify-between p-1.5 ${calDayTile(state)}`}>
                        <span className={calDayNumber(state)}>{day}</span>
                        {n ? (
                          <span className="sr-only">{n === 1 ? "1 postagem" : `${n} postagens`}</span>
                        ) : null}
                        {n ? (
                          <span
                            aria-hidden
                            className={`h-1.5 w-3 rounded-full ${state.today ? "bg-white" : "bg-olive-600"}`}
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
    </div>
  );
}
