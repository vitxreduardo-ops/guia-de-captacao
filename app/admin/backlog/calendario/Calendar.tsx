"use client";

import { Fragment, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BacklogCardDrawer } from "@/components/admin/BacklogCardDrawer";
import { BacklogCardView } from "@/components/admin/BacklogCardView";
import { BacklogFilters } from "@/components/admin/BacklogFilters";
import {
  BACKLOG_FORMAT_LABELS,
  DEFAULT_DURATION_MINUTES,
  EMPTY_BACKLOG_FILTER,
  filterBacklogCards,
  type BacklogBoard,
  type BacklogCard,
  type BacklogFilter,
} from "@/lib/backlogTypes";
import {
  deleteBacklogCardAction,
  setBacklogCardScheduleAction,
  setBacklogCardCaptureAction,
  updateBacklogCardAction,
} from "@/app/admin/kanbanActions";

const DAY_PREFIX = "day-";
const SLOT_PREFIX = "slot-";
/** Linha "sem horário" das vistas de hora: soltar ali limpa o horário. */
const NOTIME_PREFIX = "notime-";
/** Altura de uma faixa de hora, em px. Espelhada no `h-12` da célula. */
const HOUR_HEIGHT = 48;
const UNDATED_ID = "undated";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-08-20" -> "Qui 20/08", sem passar por fuso. */
function formatDayLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday =
    WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${pad(day)}/${pad(month)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Dias da grade do mês, sempre começando no domingo e completando a última
 * semana. Datas são montadas em UTC porque `post_date` é um `date` puro do
 * Postgres — usar horário local deslocaria o dia em fusos negativos.
 */
function buildMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  const days: { iso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    days.push({
      iso: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
        date.getUTCDate(),
      )}`,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    });
    // Para de gerar quando a semana já passou do mês inteiro.
    if (i >= 27 && date.getUTCDay() === 6 && date.getUTCMonth() !== month)
      break;
  }
  return days;
}

type CalendarView = "month" | "7d" | "today";

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Mês",
  "7d": "7 dias",
  today: "Hoje",
};

const VIEW_LENGTHS: Record<Exclude<CalendarView, "month">, number> = {
  "7d": 7,
  today: 1,
};

/** Régua da vista "Hoje" — fora desse intervalo raramente se publica. */
const DAY_HOURS = Array.from({ length: 17 }, (_, index) => index + 6);

/**
 * O que aparece no calendário. No quadro do Instagram é só o dia do post; no
 * de entregas o mesmo card aparece duas vezes, na captação e na entrega, e
 * cada uma tem a sua data e o seu horário.
 */
type EventKind = "entrega" | "captacao";

interface CalendarEvent {
  /** Id do arraste: o mesmo card tem dois eventos, então o card sozinho não basta. */
  id: string;
  card: BacklogCard;
  kind: EventKind;
  /** Só o quadro de entregas distingue captação de entrega na tela. */
  labelled: boolean;
}

function eventTime(event: CalendarEvent): string | null {
  return event.kind === "captacao"
    ? event.card.capture_time
    : event.card.post_time;
}

function hourOf(event: CalendarEvent): number | null {
  const time = eventTime(event);
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  return Number.isFinite(hour) ? hour : null;
}

/** Dias corridos a partir de hoje, para as vistas que não são de mês. */
function buildRangeDays(startIso: string, count: number) {
  const [year, month, day] = startIso.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day + index));
    return {
      iso: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
        date.getUTCDate(),
      )}`,
      day: date.getUTCDate(),
      weekday: WEEKDAYS[date.getUTCDay()],
      month: date.getUTCMonth(),
      inMonth: true,
    };
  });
}

function CardChip({
  event,
  color,
  columnName,
  clientName,
  assigneeName,
}: {
  event: CalendarEvent;
  color: string;
  columnName: string;
  clientName: string | null;
  assigneeName: string | null;
}) {
  const { card } = event;
  const captacao = event.kind === "captacao";
  const time = eventTime(event)?.slice(0, 5);
  return (
    <span
      className={`block rounded px-1 py-0.5 text-left sm:px-1.5 sm:py-1 ${
        captacao ? "bg-sky-50" : "bg-neutral-50"
      }`}
      title={columnName}
    >
      <span className="flex items-center gap-1">
        {/* Bolinha = etapa do kanban em que o material está. */}
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {/* Em célula estreita o título quebra em duas linhas em vez de virar
            duas letras e reticências. */}
        <span className="line-clamp-2 text-[10px] font-medium leading-tight text-neutral-800 sm:truncate sm:text-[11px]">
          {card.title}
        </span>
        <span className="sr-only">
          ({event.labelled ? `${captacao ? "captação" : "entrega"}, ` : ""}
          {columnName})
        </span>
      </span>
      {/* No celular a célula é estreita: só o título cabe. */}
      <span className="hidden truncate text-[10px] text-neutral-500 sm:block">
        {event.labelled ? (
          <span
            className={`font-medium ${captacao ? "text-sky-700" : "text-neutral-700"}`}
          >
            {captacao ? "Captação" : "Entrega"}
            {time ? ` ${time}` : ""}
          </span>
        ) : (
          BACKLOG_FORMAT_LABELS[card.format]
        )}
        {clientName ? ` · ${clientName}` : ""}
        {assigneeName ? ` · @${assigneeName}` : ""}
      </span>
    </span>
  );
}

function DraggableCard({
  event,
  color,
  columnName,
  clientName,
  assigneeName,
  onOpen,
}: {
  event: CalendarEvent;
  color: string;
  columnName: string;
  clientName: string | null;
  assigneeName: string | null;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: event.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`w-full cursor-grab hover:brightness-95 ${
        isDragging ? "opacity-40" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <CardChip
        event={event}
        color={color}
        columnName={columnName}
        clientName={clientName}
        assigneeName={assigneeName}
      />
    </button>
  );
}

function DayCell({
  iso,
  label,
  muted,
  isToday,
  className,
  children,
}: {
  iso: string;
  /** "20" no mês, "Qui 20/08" nas vistas de intervalo. */
  label: string;
  /** Dia de fora do mês exibido. */
  muted: boolean;
  isToday: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${iso}` });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 p-1 sm:min-h-28 sm:p-1.5 ${className ?? ""} ${
        muted ? "bg-neutral-50" : "bg-white"
      } ${
        isOver ? "outline outline-2 -outline-offset-2 outline-neutral-400" : ""
      }`}
    >
      <p
        className={`mb-1 text-xs ${
          isToday
            ? "font-semibold text-neutral-900"
            : muted
              ? "text-neutral-300"
              : "text-neutral-500"
        }`}
      >
        {label}
      </p>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

/**
 * Card dentro da régua: a altura reflete a duração, e a alça de baixo estica
 * em passos de uma hora. O resize usa pointer events próprios porque o
 * dnd-kit já governa o arraste do card inteiro.
 */
function ScheduledCard({
  event,
  color,
  columnName,
  clientName,
  assigneeName,
  onOpen,
}: {
  event: CalendarEvent;
  color: string;
  columnName: string;
  clientName: string | null;
  assigneeName: string | null;
  onOpen: () => void;
}) {
  const { card } = event;
  const [previewHours, setPreviewHours] = useState<number | null>(null);

  const savedHours =
    event.kind === "captacao"
      ? 1
      : Math.max(
          1,
          Math.round((card.duration_minutes ?? DEFAULT_DURATION_MINUTES) / 60),
        );
  const hours = previewHours ?? savedHours;

  function startResize(event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const handle = event.currentTarget as HTMLElement;
    // `setPointerCapture` lança se o ponteiro não estiver ativo (acontece com
    // eventos sintéticos); sem captura o resize ainda funciona.
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {}

    function onMove(moveEvent: PointerEvent) {
      const delta = Math.round((moveEvent.clientY - startY) / HOUR_HEIGHT);
      setPreviewHours(Math.max(1, savedHours + delta));
    }

    function onUp(upEvent: PointerEvent) {
      try {
        handle.releasePointerCapture(upEvent.pointerId);
      } catch {}
      handle.removeEventListener("pointermove", onMove as EventListener);
      handle.removeEventListener("pointerup", onUp as EventListener);
      const delta = Math.round((upEvent.clientY - startY) / HOUR_HEIGHT);
      const nextHours = Math.max(1, savedHours + delta);
      setPreviewHours(null);
      if (nextHours !== savedHours) {
        void setBacklogCardScheduleAction({
          id: card.id,
          postDate: card.post_date,
          postTime: card.post_time?.slice(0, 5) ?? null,
          durationMinutes: nextHours * 60,
        });
      }
    }

    handle.addEventListener("pointermove", onMove as EventListener);
    handle.addEventListener("pointerup", onUp as EventListener);
  }

  return (
    <div
      className="absolute inset-x-1 top-0.5 z-10"
      style={{ height: hours * HOUR_HEIGHT - 4 }}
    >
      <div className="relative h-full overflow-hidden rounded border border-neutral-200 bg-white shadow-sm">
        <DraggableCard
          event={event}
          color={color}
          columnName={columnName}
          clientName={clientName}
          assigneeName={assigneeName}
          onOpen={onOpen}
        />
      </div>
      {/* A duração é da entrega; a captação ocupa sempre uma faixa. */}
      {event.kind === "entrega" ? (
        <span
          onPointerDown={startResize}
          role="separator"
          aria-label={`Duração: ${hours}h. Arraste para mudar.`}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b bg-transparent hover:bg-neutral-300/60"
        />
      ) : null}
    </div>
  );
}

/** Célula de um dia numa linha de hora. Soltar aqui define data e horário. */
function WeekHourCell({
  iso,
  hour,
  events,
  colorOf,
  columnNameOf,
  clientOf,
  assigneeOf,
  onOpenCard,
}: {
  iso: string;
  /** null na faixa "sem horário": soltar ali limpa o horário. */
  hour: number | null;
  events: CalendarEvent[];
  colorOf: (card: BacklogCard) => string;
  columnNameOf: (card: BacklogCard) => string;
  clientOf: (card: BacklogCard) => string | null;
  assigneeOf: (card: BacklogCard) => string | null;
  onOpenCard: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id:
      hour === null ? `${NOTIME_PREFIX}${iso}` : `${SLOT_PREFIX}${iso}-${hour}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ height: HOUR_HEIGHT }}
      className={`relative ${isOver ? "bg-neutral-100" : "bg-white"}`}
    >
      {events.map((event) => (
        <ScheduledCard
          key={event.id}
          event={event}
          color={colorOf(event.card)}
          columnName={columnNameOf(event.card)}
          clientName={clientOf(event.card)}
          assigneeName={assigneeOf(event.card)}
          onOpen={() => onOpenCard(event.card.id)}
        />
      ))}
    </div>
  );
}

/**
 * Uma faixa de hora da vista "Hoje". Recebe drop como qualquer dia: soltar
 * aqui mantém a data de hoje (o horário em si é definido no drawer).
 */
function TodayHourRow({
  iso,
  hour,
  label,
  events,
  colorOf,
  columnNameOf,
  clientOf,
  assigneeOf,
  onOpenCard,
}: {
  iso: string;
  hour: number | null;
  label: string;
  events: CalendarEvent[];
  colorOf: (card: BacklogCard) => string;
  columnNameOf: (card: BacklogCard) => string;
  clientOf: (card: BacklogCard) => string | null;
  assigneeOf: (card: BacklogCard) => string | null;
  onOpenCard: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id:
      hour === null ? `${NOTIME_PREFIX}${iso}` : `${SLOT_PREFIX}${iso}-${hour}`,
  });

  return (
    <div className="flex border-b border-neutral-200 last:border-b-0">
      <span className="w-20 shrink-0 px-2 pt-1 text-right text-xs text-neutral-400">
        {label}
      </span>
      <div
        ref={setNodeRef}
        style={{ height: HOUR_HEIGHT }}
        className={`relative flex-1 ${isOver ? "bg-neutral-100" : "bg-white"}`}
      >
        {events.map((event) => (
          <ScheduledCard
            key={event.id}
            event={event}
            color={colorOf(event.card)}
            columnName={columnNameOf(event.card)}
            clientName={clientOf(event.card)}
            assigneeName={assigneeOf(event.card)}
            onOpen={() => onOpenCard(event.card.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Materiais ainda sem data, num menu que também é alvo de arraste: soltar um
 * card em cima do botão tira a data dele. Precisa ser um componente separado
 * porque `useDroppable` só enxerga o contexto abaixo do `DndContext`, e o
 * `Calendar` é quem renderiza o contexto.
 */
function UndatedMenu({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: UNDATED_ID });

  return (
    <div ref={setNodeRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm ${
          isOver
            ? "border-neutral-500 bg-neutral-100 text-neutral-900"
            : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        Sem data ({count}) ▾
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
          {children}
        </div>
      ) : null}

      {/* Enquanto arrasta, o painel abre sozinho pra mostrar onde o card cai. */}
      {isOver && !open ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-neutral-300 bg-white p-2 text-xs text-neutral-500 shadow-lg">
          Solte pra tirar a data deste material.
        </div>
      ) : null}
    </div>
  );
}

export function Calendar({
  board,
  mode = "instagram",
}: {
  board: BacklogBoard;
  /** "entregas" mostra captação e entrega e abre o card com cobrança. */
  mode?: "instagram" | "entregas";
}) {
  const entregas = mode === "entregas";
  const today = new Date();
  const [cards, setCards] = useState(board.cards);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<BacklogFilter>(EMPTY_BACKLOG_FILTER);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("month");
  // Clicar no card abre a visualização; o botão "Editar" dela abre o form.
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Igual ao kanban: o servidor manda, e cada revalidação sobrescreve o
  // estado otimista do arraste. Ajuste no render evita render em cascata.
  const [renderedCards, setRenderedCards] = useState(board.cards);
  if (renderedCards !== board.cards) {
    setRenderedCards(board.cards);
    setCards(board.cards);
  }

  const clientNameById = useMemo(
    () => new Map(board.clients.map((client) => [client.id, client.name])),
    [board.clients],
  );

  const assigneeNameById = useMemo(
    () => new Map(board.users.map((user) => [user.id, user.username])),
    [board.users],
  );

  const columnById = useMemo(
    () => new Map(board.columns.map((column) => [column.id, column])),
    [board.columns],
  );

  const filtered = useMemo(
    () => filterBacklogCards(cards, filter, board.checklist),
    [cards, filter, board.checklist],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    function add(date: string, event: CalendarEvent) {
      const list = map.get(date) ?? [];
      list.push(event);
      map.set(date, list);
    }
    for (const card of filtered) {
      if (card.post_date) {
        add(card.post_date, {
          id: `${card.id}:entrega`,
          card,
          kind: "entrega",
          labelled: entregas,
        });
      }
      if (entregas && card.capture_date) {
        add(card.capture_date, {
          id: `${card.id}:captacao`,
          card,
          kind: "captacao",
          labelled: true,
        });
      }
    }
    return map;
  }, [filtered, entregas]);

  // Só a entrega entra em "Sem data": a captação é opcional, e listar todo
  // card sem captação encheria o menu de coisa que não está atrasada.
  const undated = useMemo(
    () =>
      filtered
        .filter((card) => !card.post_date)
        .map<CalendarEvent>((card) => ({
          id: `${card.id}:entrega`,
          card,
          kind: "entrega",
          labelled: entregas,
        })),
    [filtered, entregas],
  );

  const monthDays = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);
    const { active, over } = event;
    if (!over) return;

    const [cardId, kindText] = String(active.id).split(":");
    const kind: EventKind = kindText === "captacao" ? "captacao" : "entrega";
    const overId = String(over.id);
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;

    const currentDate =
      kind === "captacao" ? card.capture_date : card.post_date;
    const currentTime =
      kind === "captacao" ? card.capture_time : card.post_time;

    /** Grava o novo dia/horário no evento arrastado, otimista e no servidor. */
    function move(date: string | null, time: string | null) {
      setCards((current) =>
        current.map((item) => {
          if (item.id !== cardId) return item;
          return kind === "captacao"
            ? { ...item, capture_date: date, capture_time: time }
            : { ...item, post_date: date, post_time: time };
        }),
      );
      void (kind === "captacao"
        ? setBacklogCardCaptureAction({
            id: cardId,
            captureDate: date,
            captureTime: time,
          })
        : setBacklogCardScheduleAction({
            id: cardId,
            postDate: date,
            postTime: time,
            durationMinutes: card!.duration_minutes,
          }));
    }

    // Slot de hora: grava data e horário. Dia inteiro ou menu "sem data":
    // grava só a data (limpando o horário) ou tira tudo.
    if (overId.startsWith(SLOT_PREFIX)) {
      const rest = overId.slice(SLOT_PREFIX.length);
      const separator = rest.lastIndexOf("-");
      const iso = rest.slice(0, separator);
      const hour = Number(rest.slice(separator + 1));
      const time = `${pad(hour)}:00`;
      if (currentDate === iso && currentTime?.slice(0, 5) === time) return;
      move(iso, time);
      return;
    }

    // Soltar num dia muda só o dia. No quadro de entregas o horário é parte
    // do combinado (uma captação às 16h continua às 16h em outro dia), então
    // ele fica; só a linha "sem horário" e o menu "sem data" o limpam.
    const nextDate = overId.startsWith(DAY_PREFIX)
      ? overId.slice(DAY_PREFIX.length)
      : overId.startsWith(NOTIME_PREFIX)
        ? overId.slice(NOTIME_PREFIX.length)
        : overId === UNDATED_ID
          ? null
          : undefined;
    if (nextDate === undefined) return;
    const keepTime = entregas && overId.startsWith(DAY_PREFIX);
    // O banco devolve "16:00:00"; a gravação só aceita "16:00".
    const nextTime = keepTime ? (currentTime?.slice(0, 5) ?? null) : null;
    if (currentDate === nextDate && currentTime?.slice(0, 5) === nextTime)
      return;
    move(nextDate, nextTime);
  }

  const editingCard = editingCardId
    ? (cards.find((card) => card.id === editingCardId) ?? null)
    : null;
  const openCard = openCardId
    ? (cards.find((card) => card.id === openCardId) ?? null)
    : null;
  const activeCard = activeCardId
    ? ([...eventsByDate.values(), undated]
        .flat()
        .find((item) => item.id === activeCardId) ?? null)
    : null;

  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate(),
  )}`;

  // Nas vistas de intervalo a contagem começa hoje, então navegar por mês não
  // se aplica — o cabeçalho vira só o rótulo do período.
  const rangeDays =
    view === "month" ? [] : buildRangeDays(todayIso, VIEW_LENGTHS[view]);

  function colorOf(card: BacklogCard) {
    return columnById.get(card.column_id)?.color ?? "#6b7280";
  }

  function clientOf(card: BacklogCard) {
    return card.client_id ? (clientNameById.get(card.client_id) ?? null) : null;
  }

  /** Vários responsáveis viram uma linha só; o calendário tem pouco espaço. */
  function assigneeOf(card: BacklogCard) {
    const names = card.assignee_ids
      .map((id) => assigneeNameById.get(id))
      .filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(", ") : null;
  }

  function columnNameOf(card: BacklogCard) {
    return columnById.get(card.column_id)?.name ?? "Sem etapa";
  }

  return (
    <DndContext
      // Id fixo pelo mesmo motivo do kanban: manter os ids de acessibilidade
      // iguais no servidor e no cliente.
      id="backlog-calendar"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCardId(null)}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3">
        {view === "month" ? (
          <>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              ←
            </button>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="min-w-44 rounded-md px-2 py-1.5 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                  >
                    {MONTH_NAMES[month]} {year} ▾
                  </button>
                }
              />
              <PopoverContent align="start" className="w-auto p-0">
                <DatePicker
                  mode="single"
                  captionLayout="dropdown"
                  month={new Date(year, month, 1)}
                  onMonthChange={(date) => {
                    setYear(date.getFullYear());
                    setMonth(date.getMonth());
                  }}
                  selected={new Date(year, month, 1)}
                  onSelect={(date) => {
                    if (!date) return;
                    setYear(date.getFullYear());
                    setMonth(date.getMonth());
                    setPickerOpen(false);
                  }}
                  className="rounded-lg border"
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              →
            </button>
          </>
        ) : (
          <p className="min-w-44 px-2 py-1.5 text-sm font-semibold text-neutral-900">
            {view === "today"
              ? `Hoje, ${formatDayLabel(todayIso)}`
              : `${formatDayLabel(rangeDays[0].iso)} — ${formatDayLabel(
                  rangeDays[rangeDays.length - 1].iso,
                )}`}
          </p>
        )}

        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {VIEW_LABELS[view]} ▾
              </button>
            }
          />
          <PopoverContent align="start" className="w-40">
            {(Object.keys(VIEW_LABELS) as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  view === option
                    ? "bg-neutral-900 font-medium text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {VIEW_LABELS[option]}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <div className="min-w-40 flex-1">
          <UndatedMenu count={undated.length}>
            {undated.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Todos os materiais têm data. Arraste um card pra cá pra tirar a
                data dele.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {undated.map((card) => (
                  <li key={card.id}>
                    <DraggableCard
                      event={card}
                      color={colorOf(card.card)}
                      columnName={columnNameOf(card.card)}
                      clientName={clientOf(card.card)}
                      assigneeName={assigneeOf(card.card)}
                      onOpen={() => setOpenCardId(card.card.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </UndatedMenu>
        </div>

        <BacklogFilters
          filter={filter}
          onChange={setFilter}
          clients={board.clients}
          users={board.users}
          align="end"
        />
      </div>

      <p className="hidden text-sm text-neutral-500 sm:block">
        {entregas
          ? 'Arraste uma entrega ou uma captação pra outro dia pra mudar a data dela, ou solte no menu "Sem data" pra tirar a data.'
          : 'Arraste um material pra outro dia pra mudar a data de post, ou solte no menu "Sem data" pra tirar a data.'}
      </p>

      <ul className="mb-3 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {entregas ? (
          <li className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span aria-hidden className="h-2 w-4 rounded-sm bg-sky-100" />
            Captação
            <span
              aria-hidden
              className="ml-2 h-2 w-4 rounded-sm bg-neutral-200"
            />
            Entrega
          </li>
        ) : null}
        {board.columns.map((column) => (
          <li
            key={column.id}
            className="flex items-center gap-1.5 text-xs text-neutral-500"
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            {column.name}
          </li>
        ))}
      </ul>

      <div className="w-full min-w-0 max-w-full overflow-x-auto">
        {/* No celular o mês cabe inteiro (células menores); as vistas de hora
            não cabem em 375px, então mantêm largura mínima e rolam dentro
            deste container, sem empurrar a página. */}
        <div
          className={
            view === "today"
              ? ""
              : view === "month"
                ? "sm:min-w-[52rem]"
                : "min-w-[44rem]"
          }
        >
          {view === "month" ? (
            <>
              <div className="grid grid-cols-7 gap-px rounded-t-lg border border-neutral-200 bg-neutral-200">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="bg-neutral-50 py-2 text-center text-xs font-medium text-neutral-500"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px border-x border-b border-neutral-200 bg-neutral-200">
                {monthDays.map((day) => (
                  <DayCell
                    key={day.iso}
                    iso={day.iso}
                    label={String(day.day)}
                    muted={!day.inMonth}
                    isToday={day.iso === todayIso}
                  >
                    {(eventsByDate.get(day.iso) ?? []).map((item) => (
                      <li key={item.id}>
                        <DraggableCard
                          event={item}
                          color={colorOf(item.card)}
                          columnName={columnNameOf(item.card)}
                          clientName={clientOf(item.card)}
                          assigneeName={assigneeOf(item.card)}
                          onOpen={() => setOpenCardId(item.card.id)}
                        />
                      </li>
                    ))}
                  </DayCell>
                ))}
              </div>
            </>
          ) : view === "7d" ? (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <div className="grid grid-cols-[3rem_repeat(7,1fr)] gap-px bg-neutral-200 sm:grid-cols-[5rem_repeat(7,1fr)]">
                <div className="bg-neutral-50 py-2" />
                {rangeDays.map((day) => (
                  <div
                    key={day.iso}
                    className={`bg-neutral-50 py-2 text-center text-xs ${
                      day.iso === todayIso
                        ? "font-semibold text-neutral-900"
                        : "text-neutral-500"
                    }`}
                  >
                    {day.weekday} {pad(day.day)}/{pad(day.month + 1)}
                  </div>
                ))}

                {/* Sem horário definido: linha própria antes da régua. */}
                <div className="bg-neutral-50 px-2 py-1 text-right text-xs text-neutral-400">
                  Sem horário
                </div>
                {rangeDays.map((day) => (
                  <WeekHourCell
                    key={`none-${day.iso}`}
                    iso={day.iso}
                    hour={null}
                    events={(eventsByDate.get(day.iso) ?? []).filter(
                      (item) => hourOf(item) === null,
                    )}
                    colorOf={colorOf}
                    columnNameOf={columnNameOf}
                    clientOf={clientOf}
                    assigneeOf={assigneeOf}
                    onOpenCard={setOpenCardId}
                  />
                ))}

                {DAY_HOURS.map((hour) => (
                  <Fragment key={hour}>
                    <div className="bg-neutral-50 px-2 py-1 text-right text-xs text-neutral-400">
                      {pad(hour)}:00
                    </div>
                    {rangeDays.map((day) => (
                      <WeekHourCell
                        key={`${hour}-${day.iso}`}
                        iso={day.iso}
                        hour={hour}
                        events={(eventsByDate.get(day.iso) ?? []).filter(
                          (item) => hourOf(item) === hour,
                        )}
                        colorOf={colorOf}
                        columnNameOf={columnNameOf}
                        clientOf={clientOf}
                        assigneeOf={assigneeOf}
                        onOpenCard={setOpenCardId}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              {/* Materiais do dia sem horário definido ficam no topo. */}
              <TodayHourRow
                iso={todayIso}
                hour={null}
                label="Sem horário"
                events={(eventsByDate.get(todayIso) ?? []).filter(
                  (item) => hourOf(item) === null,
                )}
                colorOf={colorOf}
                columnNameOf={columnNameOf}
                clientOf={clientOf}
                assigneeOf={assigneeOf}
                onOpenCard={setOpenCardId}
              />

              {DAY_HOURS.map((hour) => (
                <TodayHourRow
                  key={hour}
                  iso={todayIso}
                  hour={hour}
                  label={`${pad(hour)}:00`}
                  events={(eventsByDate.get(todayIso) ?? []).filter(
                    (item) => hourOf(item) === hour,
                  )}
                  colorOf={colorOf}
                  columnNameOf={columnNameOf}
                  clientOf={clientOf}
                  assigneeOf={assigneeOf}
                  onOpenCard={setOpenCardId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="w-44">
            <CardChip
              event={activeCard}
              color={colorOf(activeCard.card)}
              columnName={columnNameOf(activeCard.card)}
              clientName={clientOf(activeCard.card)}
              assigneeName={assigneeOf(activeCard.card)}
            />
          </div>
        ) : null}
      </DragOverlay>

      {openCard && !editingCard ? (
        <BacklogCardView
          card={openCard}
          checklist={board.checklist}
          activity={board.activity}
          columnName={columnNameOf(openCard)}
          columnColor={colorOf(openCard)}
          clientName={clientOf(openCard)}
          assigneeNames={
            assigneeOf(openCard) ? assigneeOf(openCard)!.split(", ") : []
          }
          guideTitle={
            board.guides.find((guide) => guide.id === openCard.guide_id)
              ?.title ?? null
          }
          authorNameById={assigneeNameById}
          canComment={board.columns[0]?.id !== openCard.column_id}
          showBilling={entregas}
          onClose={() => setOpenCardId(null)}
          onEdit={() => setEditingCardId(openCard.id)}
        />
      ) : null}

      {editingCard ? (
        <BacklogCardDrawer
          card={editingCard}
          checklist={board.checklist}
          activity={board.activity}
          isFirstColumn={board.columns[0]?.id === editingCard.column_id}
          clients={board.clients}
          guides={board.guides}
          users={board.users}
          services={board.services}
          showBilling={entregas}
          onClose={() => {
            setEditingCardId(null);
            setOpenCardId(null);
          }}
          onSave={updateBacklogCardAction}
          onDelete={async (id) => {
            const formData = new FormData();
            formData.set("id", id);
            await deleteBacklogCardAction(formData);
          }}
        />
      ) : null}
    </DndContext>
  );
}
