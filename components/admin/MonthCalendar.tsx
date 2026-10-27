"use client";

import { useState } from "react";
import { EventDetails } from "@/components/admin/EventDetails";
import { calCard, calDayNumber, calDayTile, calWeekday } from "@/lib/calendarStyle";
import { eventTint } from "@/lib/eventColor";
import type { WeekEvent } from "@/lib/googleCalendar";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
    origin: { x: number; y: number } | null;
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
    <div className={calCard}>
      <div>
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label) => (
              <div key={label} className={`flex-1 py-1 ${calWeekday}`}>
                {label}
              </div>
            ))}
          </div>

          {Array.from({ length: 6 }, (_, week) => (
            <div key={week} className="flex gap-1.5">
              {days.slice(week * 7, week * 7 + 7).map((day, column) => {
                const index = week * 7 + column;
                const dayEvents = byDay.get(index) ?? [];
                const state = {
                  today: day.key === todayKey,
                  past: todayKey !== null && day.key < todayKey,
                  outside: day.key.slice(0, 7) !== monthKey,
                };
                return (
                  <div
                    key={day.key}
                    className={`min-h-16 min-w-0 flex-1 p-1 sm:min-h-[7rem] sm:p-1.5 ${calDayTile(state)}`}
                  >
                    <div className="mb-1 px-0.5">
                      <span className={calDayNumber(state)}>{day.day}</span>
                    </div>

                    <div className="space-y-0.5">
                      {dayEvents.map((event) => {
                        // A cor cheia do Google é feita pra bloco grande com
                        // texto branco por cima. Aqui ela vira fundo claro +
                        // texto escuro do mesmo matiz, que é o que aguenta
                        // texto pequeno sem perder a identidade da agenda.
                        const tint = eventTint(event.color);
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={(clickEvent) => {
                              const bounds =
                                clickEvent.currentTarget.getBoundingClientRect();
                              setSelected({
                                event,
                                dayKey: day.key,
                                origin: {
                                  x: bounds.left + bounds.width / 2,
                                  y: bounds.top + bounds.height / 2,
                                },
                              });
                            }}
                            title={`${event.title} · ${event.calendarName}`}
                            style={{ backgroundColor: tint.bg, color: tint.fg }}
                            className="flex w-full flex-wrap items-baseline gap-x-1 rounded px-1 py-0.5 max-sm:h-2 max-sm:p-0 text-left text-[0.6875rem] transition-[filter,transform] hover:brightness-95 active:scale-90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 focus-visible:outline-none"
                          >
                            {/* Dia inteiro não tem hora que valha a pena
                                mostrar: fica só o título, na largura toda.
                                No celular a coluna tem uns 45px: o
                                compromisso vira uma barra na cor da agenda,
                                e o título fica só pro leitor de tela. */}
                            {event.allDay ? null : (
                              <span className="shrink-0 tabular-nums opacity-70 max-sm:hidden">
                                {timeText(event.startMinutes)}
                              </span>
                            )}
                            <span className="line-clamp-2 min-w-0 flex-1 basis-16 break-words max-sm:sr-only">
                              {event.title}
                            </span>
                          </button>
                        );
                      })}
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
        origin={selected?.origin ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
