"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCalendarAction } from "@/app/admin/agenda/actions";
import type { AgendaView } from "@/components/admin/ViewPicker";
import type { CalendarSource } from "@/lib/googleCalendar";

const MONTH_TITLE = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function addDaysKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Domingo da semana daquele dia — a grade começa no domingo, igual à do
 * Google. */
function weekStartOf(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return addDaysKey(key, -date.getUTCDay());
}

/** Os 42 dias que o mini-calendário mostra: o mês inteiro mais as pontas dos
 * meses vizinhos, pra grade sempre ter seis linhas cheias e não pular de
 * altura ao trocar de mês. */
function monthGrid(monthKey: string) {
  const start = weekStartOf(`${monthKey}-01`);
  return Array.from({ length: 42 }, (_, index) => {
    const key = addDaysKey(start, index);
    return {
      key,
      day: Number(key.slice(8, 10)),
      inMonth: key.slice(0, 7) === monthKey,
    };
  });
}

function addMonths(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  return shifted.toISOString().slice(0, 7);
}

/**
 * Mini-calendário e caixinhas de agenda, como na lateral do Google.
 *
 * As caixinhas gravam no Google (não só aqui): a semana é montada no
 * servidor a partir das agendas ligadas, então desmarcar precisa mesmo ir
 * até lá e recarregar — por isso a lista fica esmaecida enquanto grava.
 */
export function CalendarSidebar({
  calendars,
  rangeStart,
  rangeEnd,
  todayKey,
  view,
  focusMonth,
}: {
  calendars: CalendarSource[];
  /** Primeiro e último dia que a grade está mostrando — o trecho que o
   * mini-calendário marca. */
  rangeStart: string;
  rangeEnd: string;
  todayKey: string;
  /** YYYY-MM que o mini-calendário abre. Vem da data em foco, não do
   * começo do intervalo: a semana de 02/09 começa no domingo 30/08, e usar
   * o primeiro dia deixava a lateral em agosto com a grade em setembro. */
  focusMonth: string;
  /** Clicar num dia mantém a visão escolhida. */
  view: AgendaView;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [navigating, startNavigation] = useTransition();
  // Dia clicado no mini-calendário: fica marcado enquanto a grade não chega.
  const [pendingDay, setPendingDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mês visível no mini-calendário. Navegar pela grade traz o mês junto; o
  // reset no render evita um quadro com o mês antigo.
  const weekMonth = focusMonth;
  const [month, setMonth] = useState(weekMonth);
  const [monthFor, setMonthFor] = useState(weekMonth);
  if (monthFor !== weekMonth) {
    setMonthFor(weekMonth);
    setMonth(weekMonth);
  }

  // Enquanto o Google não responde, a caixinha já aparece do jeito que a
  // pessoa clicou — senão o clique parece não ter pegado por um segundo.
  const [pendingSelection, setPendingSelection] = useState<
    Record<string, boolean>
  >({});

  function toggle(calendar: CalendarSource, next: boolean) {
    setError(null);
    setPendingSelection((current) => ({ ...current, [calendar.id]: next }));
    startTransition(async () => {
      const result = await toggleCalendarAction(calendar.id, next);
      if (!result.ok) {
        setPendingSelection((current) => {
          const rest = { ...current };
          delete rest[calendar.id];
          return rest;
        });
        setError(result.message);
        return;
      }
      // A grade vem do servidor: sem recarregar, os eventos da agenda que
      // acabou de entrar não apareceriam.
      router.refresh();
      setPendingSelection((current) => {
        const rest = { ...current };
        delete rest[calendar.id];
        return rest;
      });
    });
  }

  return (
    // Sempre à vista: no celular ela fica acima da grade, em vez de
    // escondida atrás de um botão.
    <aside className="w-full space-y-5 sm:max-w-xs lg:w-56 lg:max-w-none">
      <div>
        <div className="mb-2 flex items-center gap-1">
          <h2 className="flex-1 text-sm text-neutral-800 first-letter:uppercase">
            {MONTH_TITLE.format(new Date(`${month}-15T12:00:00Z`))}
          </h2>
          <button
            type="button"
            onClick={() => setMonth((current) => addMonths(current, -1))}
            aria-label="Mês anterior"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-transform hover:bg-neutral-100 active:scale-90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            aria-label="Próximo mês"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-transform hover:bg-neutral-100 active:scale-90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="text-[0.625rem] font-medium text-neutral-400"
            >
              {label}
            </span>
          ))}

          {monthGrid(month).map((cell) => {
            const inRange = cell.key >= rangeStart && cell.key <= rangeEnd;
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => {
                  // Sem isto o clique fica sem resposta pelo tempo do
                  // render no servidor, e a pessoa clica de novo.
                  setPendingDay(cell.key);
                  startNavigation(() => {
                    router.push(
                      `/admin/agenda?vis=${view}&semana=${cell.key}`
                    );
                  });
                }}
                aria-current={isToday ? "date" : undefined}
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  isToday
                    ? "bg-blue-600 font-medium text-white"
                    : inRange
                      ? "bg-blue-50 text-neutral-800"
                      : cell.inMonth
                        ? "text-neutral-700 hover:bg-neutral-100"
                        : "text-neutral-300 hover:bg-neutral-100"
                } ${
                  navigating && pendingDay === cell.key
                    ? "ring-2 ring-blue-300"
                    : ""
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm text-neutral-800">Minhas agendas</h2>
        <ul className="space-y-1">
          {calendars.map((calendar) => {
            const checked = pendingSelection[calendar.id] ?? calendar.selected;
            // Só a linha em voo esmaece: antes a lista inteira apagava por
            // causa de uma caixinha.
            const saving = calendar.id in pendingSelection;
            return (
              <li key={calendar.id} className={saving ? "opacity-60" : ""}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 transition-transform hover:bg-neutral-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={saving}
                    onChange={(changeEvent) =>
                      toggle(calendar, changeEvent.target.checked)
                    }
                    // A cor da agenda no lugar do azul padrão do navegador,
                    // que é o que dá pra ler de relance qual bloco é qual.
                    style={{ accentColor: calendar.color }}
                    className="h-3.5 w-3.5 shrink-0 rounded-sm"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">
                    {calendar.name}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {error ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            {error}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
