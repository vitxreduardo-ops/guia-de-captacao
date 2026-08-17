"use client";

import { useMemo, useState } from "react";
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
import { BacklogFilters } from "@/components/admin/BacklogFilters";
import {
  BACKLOG_FORMAT_LABELS,
  EMPTY_BACKLOG_FILTER,
  filterBacklogCards,
  type BacklogBoard,
  type BacklogCard,
  type BacklogFilter,
} from "@/lib/backlogTypes";
import {
  deleteBacklogCardAction,
  setBacklogCardPostDateAction,
  updateBacklogCardAction,
} from "../actions";

const DAY_PREFIX = "day-";
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
        date.getUTCDate()
      )}`,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    });
    // Para de gerar quando a semana já passou do mês inteiro.
    if (i >= 27 && date.getUTCDay() === 6 && date.getUTCMonth() !== month) break;
  }
  return days;
}

function CardChip({
  card,
  color,
  columnName,
  clientName,
  assigneeName,
}: {
  card: BacklogCard;
  color: string;
  columnName: string;
  clientName: string | null;
  assigneeName: string | null;
}) {
  return (
    <span
      className="block rounded bg-neutral-50 px-1.5 py-1 text-left"
      title={columnName}
    >
      <span className="flex items-center gap-1">
        {/* Bolinha = etapa do kanban em que o material está. */}
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-[11px] font-medium text-neutral-800">
          {card.title}
        </span>
        <span className="sr-only">({columnName})</span>
      </span>
      <span className="block truncate text-[10px] text-neutral-500">
        {BACKLOG_FORMAT_LABELS[card.format]}
        {clientName ? ` · ${clientName}` : ""}
        {assigneeName ? ` · @${assigneeName}` : ""}
      </span>
    </span>
  );
}

function DraggableCard({
  card,
  color,
  columnName,
  clientName,
  assigneeName,
  onOpen,
}: {
  card: BacklogCard;
  color: string;
  columnName: string;
  clientName: string | null;
  assigneeName: string | null;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });

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
        card={card}
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
  day,
  inMonth,
  isToday,
  children,
}: {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${iso}` });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-28 p-1.5 ${inMonth ? "bg-white" : "bg-neutral-50"} ${
        isOver ? "outline outline-2 -outline-offset-2 outline-neutral-400" : ""
      }`}
    >
      <p
        className={`mb-1 text-xs ${
          isToday
            ? "font-semibold text-neutral-900"
            : inMonth
              ? "text-neutral-500"
              : "text-neutral-300"
        }`}
      >
        {day}
      </p>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

/**
 * Materiais ainda sem data, num menu que também é alvo de arraste: soltar um
 * card em cima do botão tira a data dele. Precisa ser um componente separado
 * porque `useDroppable` só enxerga o contexto abaixo do `DndContext`, e o
 * `Calendar` é quem renderiza o contexto.
 */
function UndatedMenu({ count, children }: { count: number; children: React.ReactNode }) {
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

export function Calendar({ board }: { board: BacklogBoard }) {
  const today = new Date();
  const [cards, setCards] = useState(board.cards);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<BacklogFilter>(EMPTY_BACKLOG_FILTER);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
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
    [board.clients]
  );

  const assigneeNameById = useMemo(
    () => new Map(board.users.map((user) => [user.id, user.username])),
    [board.users]
  );

  const columnById = useMemo(
    () => new Map(board.columns.map((column) => [column.id, column])),
    [board.columns]
  );

  const filtered = useMemo(
    () => filterBacklogCards(cards, filter, board.checklist),
    [cards, filter, board.checklist]
  );

  const cardsByDate = useMemo(() => {
    const map = new Map<string, BacklogCard[]>();
    for (const card of filtered) {
      if (!card.post_date) continue;
      const list = map.get(card.post_date) ?? [];
      list.push(card);
      map.set(card.post_date, list);
    }
    return map;
  }, [filtered]);

  const undated = useMemo(
    () => filtered.filter((card) => !card.post_date),
    [filtered]
  );

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
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

    const cardId = String(active.id);
    const overId = String(over.id);

    const nextDate = overId.startsWith(DAY_PREFIX)
      ? overId.slice(DAY_PREFIX.length)
      : overId === UNDATED_ID
        ? null
        : undefined;
    if (nextDate === undefined) return;

    const card = cards.find((item) => item.id === cardId);
    if (!card || card.post_date === nextDate) return;

    setCards((current) =>
      current.map((item) =>
        item.id === cardId ? { ...item, post_date: nextDate } : item
      )
    );
    void setBacklogCardPostDateAction(cardId, nextDate);
  }

  const openCard = openCardId
    ? cards.find((card) => card.id === openCardId) ?? null
    : null;
  const activeCard = activeCardId
    ? cards.find((card) => card.id === activeCardId) ?? null
    : null;

  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate()
  )}`;

  function colorOf(card: BacklogCard) {
    return columnById.get(card.column_id)?.color ?? "#6b7280";
  }

  function clientOf(card: BacklogCard) {
    return card.client_id ? clientNameById.get(card.client_id) ?? null : null;
  }

  function assigneeOf(card: BacklogCard) {
    return card.assignee_id
      ? assigneeNameById.get(card.assignee_id) ?? null
      : null;
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
                      card={card}
                      color={colorOf(card)}
                      columnName={columnNameOf(card)}
                      clientName={clientOf(card)}
                      assigneeName={assigneeOf(card)}
                      onOpen={() => setOpenCardId(card.id)}
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

      <p className="text-sm text-neutral-500">
        Arraste um material pra outro dia pra mudar a data de post, ou solte no
        menu &quot;Sem data&quot; pra tirar a data.
      </p>

      <ul className="mb-3 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
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

      <div className="overflow-x-auto">
        <div className="min-w-[52rem]">
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
            {days.map((day) => (
              <DayCell
                key={day.iso}
                iso={day.iso}
                day={day.day}
                inMonth={day.inMonth}
                isToday={day.iso === todayIso}
              >
                {(cardsByDate.get(day.iso) ?? []).map((card) => (
                  <li key={card.id}>
                    <DraggableCard
                      card={card}
                      color={colorOf(card)}
                      columnName={columnNameOf(card)}
                      clientName={clientOf(card)}
                      assigneeName={assigneeOf(card)}
                      onOpen={() => setOpenCardId(card.id)}
                    />
                  </li>
                ))}
              </DayCell>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="w-44">
            <CardChip
              card={activeCard}
              color={colorOf(activeCard)}
              columnName={columnNameOf(activeCard)}
              clientName={clientOf(activeCard)}
              assigneeName={assigneeOf(activeCard)}
            />
          </div>
        ) : null}
      </DragOverlay>

      {openCard ? (
        <BacklogCardDrawer
          card={openCard}
          checklist={board.checklist}
          activity={board.activity}
          isFirstColumn={board.columns[0]?.id === openCard.column_id}
          clients={board.clients}
          guides={board.guides}
          users={board.users}
          onClose={() => setOpenCardId(null)}
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
