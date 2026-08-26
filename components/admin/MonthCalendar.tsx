"use client";

import { useState } from "react";
import { EventDetails } from "@/components/admin/EventDetails";
import type { WeekEvent } from "@/lib/googleCalendar";

const DAY_LABELS = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];

function timeText(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${display}${suffix}`
    : `${display}:${String(minute).padStart(2, "0")}${suffix}`;
}

/**
 * Visão de mês: seis linhas de sete dias, cada uma com os compromissos em
 * lista.
 *
 * Aqui não há régua de horas — num quadrado de mês os blocos proporcionais
 * viram traços ilegíveis. O que importa nessa visão é quantos e quais
 * compromissos caem em cada dia; o horário vai escrito ao lado do título.
 */
export function MonthCalendar({
  events,
  days,
  todayKey,
  monthKey,
}: {
  events: WeekEvent[];
  /** As 42 células, já resolvidas no servidor. */
  days: { key: string; day: number }[];
  todayKey: string | null;
  /** YYYY-MM do mês em foco: os dias fora dele ficam esmaecidos. */
  monthKey: string;
}) {
  const [selected, setSelected] = useState<{
    event: WeekEvent;
    dayKey: string;
  } | null>(null);

  const byDay = new Map<number, WeekEvent[]>();
  for (const event of events) {
    const list = byDay.get(event.dayIndex);
    if (list) list.push(event);
    else byDay.set(event.dayIndex, [event]);
  }
  for (const list of byDay.values()) {
    // Dia todo primeiro, depois por horário — mesma ordem do Google.
    list.sort(
      (a, b) =>
        Number(b.allDay) - Number(a.allDay) || a.startMinutes - b.startMinutes
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="flex border-b border-neutral-200">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="flex-1 border-l border-neutral-100 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-neutral-400"
              >
                {label}
              </div>
            ))}
          </div>

          {Array.from({ length: 6 }, (_, week) => (
            <div key={week} className="flex border-b border-neutral-100 last:border-b-0">
              {days.slice(week * 7, week * 7 + 7).map((day, column) => {
                const index = week * 7 + column;
                const dayEvents = byDay.get(index) ?? [];
                const outside = day.key.slice(0, 7) !== monthKey;
                return (
                  <div
                    key={day.key}
                    className={`min-h-[7rem] min-w-0 flex-1 border-l border-neutral-100 p-1 ${
                      outside ? "bg-neutral-50/60" : ""
                    }`.trim()}
                  >
                    <div className="mb-1 text-center">
                      <span
                        className={
                          day.key === todayKey
                            ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white"
                            : `text-xs ${outside ? "text-neutral-300" : "text-neutral-600"}`
                        }
                      >
                        {day.day}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelected({ event, dayKey: day.key })}
                          title={`${event.title} · ${event.calendarName}`}
                          className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-neutral-100"
                        >
                          {event.allDay ? (
                            <span
                              className="min-w-0 flex-1 truncate rounded px-1 text-white"
                              style={{ backgroundColor: event.color }}
                            >
                              {event.title}
                            </span>
                          ) : (
                            <>
                              <span
                                aria-hidden
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: event.color }}
                              />
                              <span className="shrink-0 text-neutral-400">
                                {timeText(event.startMinutes)}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-neutral-700">
                                {event.title}
                              </span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <EventDetails
        event={selected?.event ?? null}
        dayKey={selected?.dayKey ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
