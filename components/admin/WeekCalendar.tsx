"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EventDetails } from "@/components/admin/EventDetails";
import {
  EventCreate,
  type NewEventSlot,
} from "@/components/admin/EventCreate";
import { updateEventAction } from "@/app/admin/agenda/actions";
import { layoutDay } from "@/lib/dayLayout";
import type { CalendarSource, WeekEvent } from "@/lib/googleCalendar";

/** Altura de uma hora na grade. Define toda a escala vertical. */
const HOUR_HEIGHT = 48;
/** Encaixe do arrasto. 15 minutos é o passo que o Google usa. */
const SNAP_MINUTES = 15;
/** Pixels de folga antes de um clique virar arrasto — sem isso, abrir o
 * painel com a mão trêmula move o compromisso alguns minutos. */
const DRAG_THRESHOLD_PX = 5;
/** No toque ainda vale segurar antes de arrastar — é o que separa "quero
 * mover" de "quero abrir" —, mas com `touch-action: none` no bloco o gesto
 * não disputa mais com a rolagem, e a espera pôde encurtar. */
const TOUCH_HOLD_MS = 150;
const DAY_LABELS = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];

/** Dia da semana de uma chave YYYY-MM-DD. As colunas deixaram de ser sempre
 * domingo-a-sábado quando entraram as visões de dia e de 4 dias, então o
 * rótulo vem da data, não da posição. */
function weekdayOf(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function hourLabel(hour: number) {
  if (hour === 0) return "";
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${suffix}`;
}

function formatRange(event: WeekEvent) {
  const toText = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour < 12 ? "am" : "pm";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return minute === 0
      ? `${display}${suffix}`
      : `${display}:${String(minute).padStart(2, "0")}${suffix}`;
  };
  return `${toText(event.startMinutes)} – ${toText(event.endMinutes)}`;
}

/** Hora local do fuso do backlog, não a do relógio de quem abre a tela —
 * senão a linha do "agora" aponta pro horário errado pra quem estiver
 * viajando ou com o computador em outro fuso. */
const CLOCK = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Duração que um horário vazio ganha ao ser clicado. */
const NEW_EVENT_MINUTES = 30;

/** Centro de um elemento na janela — de onde o painel de detalhes cresce. */
function centerOf(element: HTMLElement): { x: number; y: number } {
  const bounds = element.getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

function timeText(minutes: number) {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
}

export function WeekCalendar({
  events,
  days,
  todayKey,
  writableCalendars,
}: {
  events: WeekEvent[];
  /** Chaves YYYY-MM-DD das colunas (1, 4 ou 7 dias), já resolvidas no
   * servidor. */
  days: { key: string; day: number }[];
  todayKey: string | null;
  /** Agendas em que a conta pode criar compromissos. */
  writableCalendars: CalendarSource[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const [selected, setSelected] = useState<{
    event: WeekEvent;
    dayKey: string;
    /** Centro do bloco clicado: é de lá que o painel de detalhes cresce. */
    origin: { x: number; y: number } | null;
  } | null>(null);
  const [newSlot, setNewSlot] = useState<NewEventSlot | null>(null);
  /** Aviso no rodapé: erro de gravação ou o "movido", com o desfazer junto.
   * Substitui o `window.alert`, que era bloqueante e aparecia no meio do
   * gesto. */
  const [notice, setNotice] = useState<{
    message: string;
    tone: "info" | "error";
    undo?: () => void;
  } | null>(null);

  const router = useRouter();
  const columnsRef = useRef<HTMLDivElement>(null);
  // Posição provisória durante e logo depois do arrasto: a grade vem do
  // servidor, então sem isso o bloco voltaria pro lugar antigo até o
  // refresh chegar.
  const [override, setOverride] = useState<{
    id: string;
    dayIndex: number;
    startMinutes: number;
    endMinutes: number;
  } | null>(null);
  const [drag, setDrag] = useState<{
    event: WeekEvent;
    /** Distância entre o topo do bloco e onde o dedo pegou. */
    grabOffsetMinutes: number;
    dayIndex: number;
    startMinutes: number;
    moved: boolean;
  } | null>(null);
  // Arrasto de evento repetido só é gravado depois de a pessoa escolher se
  // vale pra um dia ou pra série.
  const [askScope, setAskScope] = useState<{
    event: WeekEvent;
    dayIndex: number;
    startMinutes: number;
    endMinutes: number;
    /** Mudou de coluna: numa série isso significaria reescrever a regra de
     * repetição, então esse caso fica restrito a "só este dia". */
    changedDay: boolean;
  } | null>(null);

  const save = useCallback(
    async function save(
      event: WeekEvent,
      dayIndex: number,
      startMinutes: number,
      endMinutes: number,
      scope: "single" | "series",
      /** Onde o bloco estava antes — é para lá que o "desfazer" volta. */
      undo?: { dayIndex: number; startMinutes: number; endMinutes: number }
    ) {
      const toTime = (minutes: number) =>
        `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(
          minutes % 60
        ).padStart(2, "0")}`;

      setOverride({ id: event.id, dayIndex, startMinutes, endMinutes });
      const result = await updateEventAction({
        calendarId: event.calendarId,
        eventId: event.rawId,
        recurringEventId: event.recurringEventId,
        scope,
        title: event.title,
        location: event.location ?? "",
        description: (event.description ?? "").replace(/<[^>]*>/g, ""),
        date: days[dayIndex].key,
        startTime: event.allDay ? null : toTime(startMinutes),
        endTime: event.allDay ? null : toTime(endMinutes),
      });

      if (!result.ok) {
        // Devolve o bloco pro lugar de origem e conta o motivo.
        setOverride(null);
        setNotice({ message: result.message, tone: "error" });
        return;
      }

      // Arrastar grava direto no Google: sem uma saída, o único conserto é
      // achar o compromisso e arrastar de volta na mão.
      if (undo) {
        setNotice({
          message: "Compromisso movido.",
          tone: "info",
          undo: () => {
            setNotice(null);
            void save(
              event,
              undo.dayIndex,
              undo.startMinutes,
              undo.endMinutes,
              scope
            );
          },
        });
      } else {
        setNotice(null);
      }
      router.refresh();
    },
    [days, router]
  );

  useEffect(() => {
    const tick = () => {
      const [hours, minutes] = CLOCK.format(new Date()).split(":").map(Number);
      setNowMinutes(hours * 60 + minutes);
    };
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Abre na faixa útil do dia em vez da madrugada.
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  useEffect(() => {
    // O aviso de sucesso sai sozinho; o de erro fica até ser lido e
    // fechado, porque conta algo que não aconteceu.
    if (!notice || notice.tone === "error") return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  /** Abre o formulário de novo compromisso num horário do dia. */
  function openNewSlot(dayKey: string, startMinutes: number) {
    if (writableCalendars.length === 0) return;
    const start = Math.max(
      0,
      Math.min(24 * 60 - NEW_EVENT_MINUTES, startMinutes)
    );
    setNewSlot({
      dayKey,
      startTime: timeText(start),
      endTime: timeText(start + NEW_EVENT_MINUTES),
    });
  }

  /** Começa a acompanhar o gesto, mas só vira arrasto depois do limiar (no
   * mouse) ou de segurar parado (no toque) — senão todo clique pra abrir os
   * detalhes moveria o compromisso. */
  function armDrag(event: WeekEvent, pointerEvent: React.PointerEvent) {
    if (!event.canEdit || event.allDay) return;
    if (pointerEvent.button !== 0 && pointerEvent.pointerType === "mouse") {
      return;
    }
    // Com a captura, o bloco continua recebendo o gesto mesmo quando o
    // ponteiro sai dele — inclusive fora da janela.
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

    const grid = columnsRef.current;
    const scroller = scrollRef.current;
    if (!grid || !scroller) return;

    const bounds = grid.getBoundingClientRect();
    const minutesFromTop =
      ((pointerEvent.clientY - bounds.top) / HOUR_HEIGHT) * 60;
    const grabOffsetMinutes = minutesFromTop - event.startMinutes;
    const duration = event.endMinutes - event.startMinutes;

    const startX = pointerEvent.clientX;
    const startY = pointerEvent.clientY;
    const isTouch = pointerEvent.pointerType !== "mouse";

    // Posição corrente fica em variáveis locais, não em estado: o gesto pode
    // acabar antes do React re-renderizar, e aí o estado ainda estaria vazio.
    let dragging = false;
    let dayIndex = event.dayIndex;
    let startMinutes = event.startMinutes;
    let holdTimer: number | undefined;

    function positionFrom(clientX: number, clientY: number) {
      const area = grid!.getBoundingClientRect();
      const columnWidth = area.width / 7;
      const nextDay = Math.max(
        0,
        Math.min(6, Math.floor((clientX - area.left) / columnWidth))
      );
      const raw =
        ((clientY - area.top) / HOUR_HEIGHT) * 60 - grabOffsetMinutes;
      const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
      return {
        dayIndex: nextDay,
        startMinutes: Math.max(0, Math.min(24 * 60 - duration, snapped)),
      };
    }

    function begin() {
      dragging = true;
      setDrag({
        event,
        grabOffsetMinutes,
        dayIndex,
        startMinutes,
        moved: true,
      });
    }

    function handleMove(moveEvent: PointerEvent) {
      if (!dragging) {
        const distance = Math.hypot(
          moveEvent.clientX - startX,
          moveEvent.clientY - startY
        );
        if (distance <= DRAG_THRESHOLD_PX) return;
        // No toque, mexer antes de segurar é rolagem: desiste do arrasto.
        if (isTouch) {
          finish(false);
          return;
        }
        begin();
      }

      moveEvent.preventDefault();
      const next = positionFrom(moveEvent.clientX, moveEvent.clientY);
      dayIndex = next.dayIndex;
      startMinutes = next.startMinutes;
      setOverride({
        id: event.id,
        dayIndex,
        startMinutes,
        endMinutes: startMinutes + duration,
      });
    }

    function finish(commit: boolean) {
      if (holdTimer) window.clearTimeout(holdTimer);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      setDrag(null);

      if (!commit || !dragging) return;

      const moved =
        dayIndex !== event.dayIndex || startMinutes !== event.startMinutes;
      if (!moved) {
        setOverride(null);
        return;
      }

      const endMinutes = startMinutes + duration;
      if (event.recurringEventId) {
        setAskScope({
          event,
          dayIndex,
          startMinutes,
          endMinutes,
          changedDay: dayIndex !== event.dayIndex,
        });
        return;
      }
      void save(event, dayIndex, startMinutes, endMinutes, "single", {
        dayIndex: event.dayIndex,
        startMinutes: event.startMinutes,
        endMinutes: event.endMinutes,
      });
    }

    function handleUp() {
      finish(true);
    }

    function handleCancel() {
      setOverride(null);
      finish(false);
    }

    if (isTouch) {
      holdTimer = window.setTimeout(begin, TOUCH_HOLD_MS);
    }

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  }

  /**
   * Puxar a borda de baixo pra mudar a duração.
   *
   * Mesma mecânica do mover — ouvintes registrados na hora, posição em
   * variáveis locais — mas aqui só o fim se mexe: o começo fica onde está.
   */
  function armResize(event: WeekEvent, pointerEvent: React.PointerEvent) {
    if (!event.canEdit || event.allDay) return;
    if (pointerEvent.button !== 0 && pointerEvent.pointerType === "mouse") {
      return;
    }
    // Sem isso o gesto viraria "mover" também, já que a alça fica dentro do
    // bloco.
    pointerEvent.stopPropagation();
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

    const grid = columnsRef.current;
    if (!grid) return;

    let endMinutes = event.endMinutes;
    let resizing = false;
    const startY = pointerEvent.clientY;
    const isTouch = pointerEvent.pointerType !== "mouse";
    let holdTimer: number | undefined;

    function begin() {
      resizing = true;
      setDrag({
        event,
        grabOffsetMinutes: 0,
        dayIndex: event.dayIndex,
        startMinutes: event.startMinutes,
        moved: true,
      });
    }

    function handleMove(moveEvent: PointerEvent) {
      if (!resizing) {
        if (Math.abs(moveEvent.clientY - startY) <= DRAG_THRESHOLD_PX) return;
        if (isTouch) {
          finish(false);
          return;
        }
        begin();
      }

      moveEvent.preventDefault();
      const area = grid!.getBoundingClientRect();
      const raw = ((moveEvent.clientY - area.top) / HOUR_HEIGHT) * 60;
      const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
      // Nunca deixa o fim passar do começo, nem o bloco sumir: duração
      // mínima de um passo de encaixe.
      endMinutes = Math.min(
        24 * 60,
        Math.max(event.startMinutes + SNAP_MINUTES, snapped)
      );
      setOverride({
        id: event.id,
        dayIndex: event.dayIndex,
        startMinutes: event.startMinutes,
        endMinutes,
      });
    }

    function finish(commit: boolean) {
      if (holdTimer) window.clearTimeout(holdTimer);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      setDrag(null);

      if (!commit || !resizing) return;
      if (endMinutes === event.endMinutes) {
        setOverride(null);
        return;
      }

      if (event.recurringEventId) {
        setAskScope({
          event,
          dayIndex: event.dayIndex,
          startMinutes: event.startMinutes,
          endMinutes,
          changedDay: false,
        });
        return;
      }
      void save(event, event.dayIndex, event.startMinutes, endMinutes, "single", {
        dayIndex: event.dayIndex,
        startMinutes: event.startMinutes,
        endMinutes: event.endMinutes,
      });
    }

    function handleUp() {
      finish(true);
    }

    function handleCancel() {
      setOverride(null);
      finish(false);
    }

    if (isTouch) holdTimer = window.setTimeout(begin, TOUCH_HOLD_MS);

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  }

  // A posição provisória vale só até o servidor devolver a grade já com a
  // mudança. Comparar com o que chegou (em vez de limpar num efeito) evita
  // tanto o bloco piscar de volta pro lugar antigo quanto o override ficar
  // preso — o que deixava o card sem responder a clique depois do arrasto.
  const overrideApplied =
    override !== null &&
    events.some(
      (event) =>
        event.id === override.id &&
        event.dayIndex === override.dayIndex &&
        event.startMinutes === override.startMinutes &&
        event.endMinutes === override.endMinutes
    );
  const activeOverride = overrideApplied ? null : override;

  const allDay = useMemo(
    () => events.filter((event) => event.allDay),
    [events]
  );

  // O posicionamento roda a cada render — e durante um arrasto isso é a cada
  // movimento do ponteiro. Refazer a divisão de colunas só quando os eventos
  // ou a posição provisória mudam tira esse trabalho do meio do gesto.
  const columnsByDay = useMemo(() => {
    const timed = events
      .filter((event) => !event.allDay)
      .map((event) =>
        activeOverride && activeOverride.id === event.id
          ? {
              ...event,
              dayIndex: activeOverride.dayIndex,
              startMinutes: activeOverride.startMinutes,
              endMinutes: activeOverride.endMinutes,
            }
          : event
      );
    return days.map((_, index) =>
      layoutDay(timed.filter((event) => event.dayIndex === index))
    );
  }, [events, activeOverride, days]);

  const todayIndex = days.findIndex((day) => day.key === todayKey);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {/* Sete colunas espremidas num celular ficam ilegíveis: a grade ganha
          uma largura mínima por coluna e rola de lado. Cabeçalho, faixa de
          dia todo e colunas ficam dentro do mesmo rolamento, senão eles se
          desalinham. */}
      <div className="overflow-x-auto">
      <div style={{ minWidth: `${Math.min(days.length, 7) * 6.5}rem` }}>
      {/* Cabeçalho dos dias: fora da área rolável, pra não sumir ao descer */}
      <div className="flex border-b border-neutral-200">
        <div className="w-14 shrink-0" />
        {days.map((day, index) => (
          <div key={day.key} className="flex-1 border-l border-neutral-100 py-2 text-center">
            <div className="text-[0.625rem] font-medium uppercase tracking-[0.06em] text-neutral-400">
              {DAY_LABELS[weekdayOf(day.key)]}
            </div>
            <div
              className={
                index === todayIndex
                  ? "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
                  : "mt-1 text-sm text-neutral-700"
              }
            >
              {day.day}
            </div>
          </div>
        ))}
      </div>

      {allDay.length > 0 ? (
        <div className="flex border-b border-neutral-200 bg-neutral-50/60">
          <div className="w-14 shrink-0 py-1 pr-2 text-right text-[0.625rem] text-neutral-400">
            dia todo
          </div>
          {days.map((day, index) => (
            <div key={day.key} className="min-w-0 flex-1 space-y-1 border-l border-neutral-100 p-1">
              {allDay
                .filter((event) => event.dayIndex === index)
                .map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(clickEvent) =>
                      setSelected({
                        event,
                        dayKey: day.key,
                        origin: centerOf(clickEvent.currentTarget),
                      })
                    }
                    title={`${event.title} · ${event.calendarName}`}
                    className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[0.6875rem] text-white transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="relative max-h-[70vh] overflow-y-auto">
        <div className="flex">
          {/* Régua de horas */}
          <div className="w-14 shrink-0">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="relative pr-2 text-right"
              >
                <span className="absolute right-2 -top-1.5 text-[0.625rem] text-neutral-400">
                  {hourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          <div ref={columnsRef} className="flex min-w-0 flex-1">
          {days.map((day, index) => {
            const positioned = columnsByDay[index] ?? [];
            return (
              <div
                key={day.key}
                className="relative min-w-0 flex-1 border-l border-neutral-100"
              >
                {/* Clicar num horário vazio é gesto de ponteiro; quem usa
                    teclado ou leitor de tela chega por aqui, e cai nas 9h
                    daquele dia. */}
                {writableCalendars.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openNewSlot(day.key, 9 * 60)}
                    className="sr-only z-30 focus:not-sr-only focus:absolute focus:left-1 focus:top-1 focus:rounded focus:bg-neutral-900 focus:px-2 focus:py-1 focus:text-[0.6875rem] focus:text-white"
                  >
                    Novo compromisso em {DAY_LABELS[weekdayOf(day.key)]}{" "}
                    {day.day}
                  </button>
                ) : null}

                {/* Fundo do dia. Clicar aqui cria; os blocos são irmãos
                    posteriores, então o clique neles não chega até esta
                    camada e continua abrindo os detalhes. */}
                <div
                  onClick={(clickEvent) => {
                    const bounds =
                      clickEvent.currentTarget.getBoundingClientRect();
                    const raw =
                      ((clickEvent.clientY - bounds.top) / HOUR_HEIGHT) * 60;
                    openNewSlot(
                      day.key,
                      Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES
                    );
                  }}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      style={{ height: HOUR_HEIGHT }}
                      className="border-b border-neutral-100"
                    />
                  ))}
                </div>

                {index === todayIndex && nowMinutes !== null ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20 border-t border-red-500"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <span className="absolute -left-1 -top-1 block h-2 w-2 rounded-full bg-red-500" />
                  </div>
                ) : null}

                {positioned.map(({ event, column, columns }) => {
                  const top = (event.startMinutes / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    ((event.endMinutes - event.startMinutes) / 60) * HOUR_HEIGHT,
                    18
                  );
                  const width = 100 / columns;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onPointerDown={(pointerEvent) =>
                        armDrag(event, pointerEvent)
                      }
                      onClick={(clickEvent) => {
                        // Só ignora o clique que fecha um arrasto de verdade
                        // — o que acabou de mexer neste bloco.
                        if (drag) return;
                        setSelected({
                          event,
                          dayKey: day.key,
                          origin: centerOf(clickEvent.currentTarget),
                        });
                      }}
                      title={`${event.title} · ${event.calendarName}`}
                      // `touch-action: none` entrega o gesto ao bloco em vez
                      // de à rolagem. A transição de posição só existe fora
                      // do arrasto: durante o gesto ela atrasaria o bloco em
                      // relação ao dedo.
                      style={{
                        top,
                        height,
                        left: `${column * width}%`,
                        width: `calc(${width}% - 2px)`,
                        backgroundColor: event.color,
                        touchAction: event.canEdit ? "none" : undefined,
                        transition: drag
                          ? undefined
                          : "top 220ms cubic-bezier(0.22, 1, 0.36, 1), height 220ms cubic-bezier(0.22, 1, 0.36, 1), left 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                      className={`absolute select-none overflow-hidden rounded px-1.5 py-0.5 text-left text-[0.6875rem] leading-tight text-white shadow-sm transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        // Clicar abre os detalhes; arrastar é gesto extra.
                        // Mostrar "grab" fazia o card parecer que só arrasta.
                        "cursor-pointer"
                      } ${
                        drag?.event.id === event.id
                          ? "cursor-grabbing opacity-80 ring-2 ring-white"
                          : ""
                      }`.trim()}
                    >
                      <span className="block truncate font-medium">
                        {event.title}
                      </span>
                      {height > 32 ? (
                        <span className="block truncate opacity-90">
                          {formatRange(event)}
                        </span>
                      ) : null}

                      {/* Alça de duração. Fica de fora em bloco muito baixo:
                          ali ela cobriria o próprio compromisso e o clique
                          nunca abriria os detalhes. */}
                      {event.canEdit && height > 24 ? (
                        <span
                          onPointerDown={(pointerEvent) =>
                            armResize(event, pointerEvent)
                          }
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
      </div>
      </div>
      </div>

      {askScope ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[3px] p-4">
          <div
            role="dialog"
            aria-label="Alterar compromisso que se repete"
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-medium text-neutral-900">
              Este compromisso se repete
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              &quot;{askScope.event.title}&quot; faz parte de uma série. O que
              você quer mudar?
            </p>

            {askScope.changedDay ? (
              <p className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs text-neutral-500">
                Como você mudou de dia, a alteração vale só para esta data —
                mover a série inteira para outro dia da semana precisa ser
                feito no Google.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const pending = askScope;
                  setAskScope(null);
                  void save(
                    pending.event,
                    pending.dayIndex,
                    pending.startMinutes,
                    pending.endMinutes,
                    "single",
                    {
                      dayIndex: pending.event.dayIndex,
                      startMinutes: pending.event.startMinutes,
                      endMinutes: pending.event.endMinutes,
                    }
                  );
                }}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-transform hover:bg-neutral-800 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Só este dia
              </button>

              {askScope.changedDay ? null : (
                <button
                  type="button"
                  onClick={() => {
                    const pending = askScope;
                    setAskScope(null);
                    void save(
                      pending.event,
                      pending.dayIndex,
                      pending.startMinutes,
                      pending.endMinutes,
                      "series",
                      {
                        dayIndex: pending.event.dayIndex,
                        startMinutes: pending.event.startMinutes,
                        endMinutes: pending.event.endMinutes,
                      }
                    );
                  }}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-transform hover:bg-neutral-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Todos
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  // Cancelar devolve o bloco pro lugar de origem.
                  setAskScope(null);
                  setOverride(null);
                }}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-500 transition-transform hover:bg-neutral-100 active:scale-90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EventDetails
        event={selected?.event ?? null}
        dayKey={selected?.dayKey ?? null}
        origin={selected?.origin ?? null}
        onClose={() => setSelected(null)}
      />

      <EventCreate
        slot={newSlot}
        calendars={writableCalendars}
        onClose={() => setNewSlot(null)}
      />

      {notice ? (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-2 text-sm shadow-lg ${
            notice.tone === "error"
              ? "border border-amber-200 bg-amber-50/95 text-amber-900 backdrop-blur-md"
              : "bg-neutral-900/90 text-white backdrop-blur-md"
          }`}
        >
          <span>{notice.message}</span>
          {notice.undo ? (
            <button
              type="button"
              onClick={notice.undo}
              className="rounded px-2 py-0.5 font-medium underline underline-offset-2 transition-colors hover:bg-white/10 active:bg-white/20"
            >
              Desfazer
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
            className={`rounded px-1 transition-colors ${
              notice.tone === "error"
                ? "hover:bg-amber-100"
                : "hover:bg-white/10"
            }`}
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
