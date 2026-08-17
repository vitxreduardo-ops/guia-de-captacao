"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { BacklogCardDrawer } from "@/components/admin/BacklogCardDrawer";
import { BacklogFilters } from "@/components/admin/BacklogFilters";
import {
  BacklogToaster,
  askBacklogQuestion,
} from "@/components/admin/BacklogToaster";
import {
  BACKLOG_COLUMN_COLORS,
  BACKLOG_FORMAT_LABELS,
  EMPTY_BACKLOG_FILTER,
  checklistProgress,
  countBacklogFilters,
  isApprovalColumn,
  filterBacklogCards,
  formatBacklogDateShort,
  type BacklogBoard,
  type BacklogCard,
  type BacklogChecklistItem,
  type BacklogColumn,
  type BacklogFilter,
} from "@/lib/backlogTypes";
import {
  createBacklogCardAction,
  createBacklogColumnAction,
  deleteBacklogCardAction,
  deleteBacklogColumnAction,
  moveBacklogCardAction,
  reorderBacklogColumnsAction,
  setBacklogCardApprovedAction,
  updateBacklogCardAction,
  updateBacklogColumnAction,
} from "./actions";

const DROPZONE_PREFIX = "dropzone-";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

// ------------------------------------------------------------------ card

function CardBody({
  card,
  clientName,
  assigneeName,
  checklist,
  showApproval = false,
  onOpen,
}: {
  card: BacklogCard;
  clientName: string | null;
  assigneeName: string | null;
  checklist: { done: number; total: number } | null;
  /** Só na coluna de aprovação o material pode ser marcado como aprovado. */
  showApproval?: boolean;
  onOpen?: () => void;
}) {
  const approved = Boolean(card.approved_at);

  return (
    <div
      className={`rounded-md border bg-white shadow-sm ${
        approved ? "border-emerald-300" : "border-neutral-200"
      }`}
    >
      {card.cover_url ? (
        // Capa é um link colado pelo usuário (host imprevisível), então
        // <img> em vez de next/image pra não precisar liberar domínio.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.cover_url}
          alt=""
          className="h-24 w-full rounded-t-md object-cover"
        />
      ) : null}
      <div className="p-2.5">
        <div className="flex items-start gap-2">
          {showApproval ? (
            <button
              type="button"
              // `stopPropagation` porque o card inteiro é a alça de arraste.
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void setBacklogCardApprovedAction(card.id, !approved);
              }}
              aria-pressed={approved}
              aria-label={approved ? "Desmarcar aprovação" : "Marcar como aprovado"}
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                approved
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-neutral-300 text-transparent hover:border-neutral-500"
              }`}
            >
              ✓
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpen}
            className={`block flex-1 text-left text-sm font-medium hover:underline ${
              approved ? "text-neutral-500 line-through" : "text-neutral-900"
            }`}
          >
            {card.title}
          </button>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
            {BACKLOG_FORMAT_LABELS[card.format]}
          </span>
          {clientName ? (
            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">
              {clientName}
            </span>
          ) : null}
          {assigneeName ? (
            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700">
              @{assigneeName}
            </span>
          ) : null}
          {card.post_date ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
              {formatBacklogDateShort(card.post_date)}
            </span>
          ) : null}
          {card.sent_whatsapp ? (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
              WhatsApp ✓
            </span>
          ) : null}
          {checklist ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] ${
                checklist.done === checklist.total
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              ☑ {checklist.done}/{checklist.total}
            </span>
          ) : null}
        </div>

        {card.tags.length > 0 ? (
          <p className="mt-1 truncate text-[11px] text-neutral-400">
            {card.tags.map((tag) => `#${tag}`).join(" ")}
          </p>
        ) : null}

        {card.drive_url ? (
          <a
            href={card.drive_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-[11px] text-neutral-500 underline hover:text-neutral-800"
          >
            Abrir no Drive ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SortableCard({
  card,
  clientName,
  assigneeName,
  checklist,
  showApproval,
  draggable,
  onOpen,
}: {
  card: BacklogCard;
  clientName: string | null;
  assigneeName: string | null;
  checklist: { done: number; total: number } | null;
  showApproval: boolean;
  draggable: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { type: "card", columnId: card.column_id },
      disabled: !draggable,
    });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
      {...attributes}
      {...listeners}
    >
      <CardBody
        card={card}
        clientName={clientName}
        assigneeName={assigneeName}
        checklist={checklist}
        showApproval={showApproval}
        onOpen={onOpen}
      />
    </li>
  );
}

/** Ações do quadro que não são do dia a dia — hoje, criar coluna. */
function BoardSettingsMenu() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Configurações do quadro"
            className="flex size-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
          >
            ⚙
          </button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-semibold text-neutral-900">Nova coluna</p>
        <form action={createBacklogColumnAction} className="flex flex-col gap-2">
          <input
            name="name"
            placeholder="Nome da coluna"
            required
            className={inputClass}
          />
          <select
            name="color"
            defaultValue={BACKLOG_COLUMN_COLORS[0]}
            className={inputClass}
          >
            {BACKLOG_COLUMN_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Adicionar
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------- coluna

function QuickAddCard({ columnId }: { columnId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (!String(formData.get("title") ?? "").trim()) return;
        startTransition(async () => {
          await createBacklogCardAction(formData);
          formRef.current?.reset();
        });
      }}
      className="mt-2 flex gap-1"
    >
      <input type="hidden" name="column_id" value={columnId} />
      <input
        name="title"
        placeholder="Novo material"
        disabled={pending}
        className="min-w-0 flex-1 rounded-md border border-dashed border-neutral-300 bg-white/60 px-2.5 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={pending}
        aria-label="Adicionar material"
        className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
      >
        +
      </button>
    </form>
  );
}

function ColumnHeader({
  column,
  count,
  dragHandle,
}: {
  column: BacklogColumn;
  count: number;
  dragHandle: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            await updateBacklogColumnAction(formData);
            setEditing(false);
          });
        }}
        className="mb-2 space-y-2"
      >
        <input type="hidden" name="id" value={column.id} />
        <input
          name="name"
          defaultValue={column.name}
          autoFocus
          className={inputClass}
        />
        <select name="color" defaultValue={column.color} className={inputClass}>
          {BACKLOG_COLUMN_COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-neutral-500 hover:text-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  `Excluir a coluna "${column.name}"? Os ${count} materiais dela também serão excluídos.`
                )
              ) {
                return;
              }
              const formData = new FormData();
              formData.set("id", column.id);
              startTransition(() => deleteBacklogColumnAction(formData));
            }}
            className="ml-auto text-xs text-red-500 hover:text-red-700"
          >
            Excluir coluna
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group/header mb-2 flex items-center gap-2">
      {dragHandle}
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: column.color }}
      />
      <p className="truncate text-sm font-semibold text-neutral-900">
        {column.name}
      </p>
      <span className="text-xs text-neutral-400">{count}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="ml-auto text-xs text-neutral-400 opacity-0 transition-opacity hover:text-neutral-800 focus-visible:opacity-100 group-hover/header:opacity-100"
      >
        Editar
      </button>
    </div>
  );
}

function SortableColumn({
  column,
  cards,
  clientNameById,
  assigneeNameById,
  checklistItems,
  draggable,
  onOpenCard,
}: {
  column: BacklogColumn;
  cards: BacklogCard[];
  clientNameById: Map<string, string>;
  assigneeNameById: Map<string, string>;
  checklistItems: BacklogChecklistItem[];
  draggable: boolean;
  onOpenCard: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: column.id,
      data: { type: "column" },
      disabled: !draggable,
    });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `${DROPZONE_PREFIX}${column.id}`,
    data: { type: "column-body", columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`w-72 shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 p-3 ${
        isDragging ? "opacity-50" : ""
      }`}
      {...attributes}
    >
      <ColumnHeader
        column={column}
        count={cards.length}
        dragHandle={
          <span
            {...listeners}
            className={`select-none text-neutral-300 ${
              draggable ? "cursor-grab" : "cursor-default"
            }`}
            aria-hidden
          >
            ⠿
          </span>
        }
      />

      <div
        ref={setDropRef}
        className={`min-h-16 rounded-md ${isOver ? "bg-neutral-200/60" : ""}`}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
              Nenhum material
            </p>
          ) : null}

          <ul className="flex flex-col gap-2">
            {cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                clientName={
                  card.client_id
                    ? clientNameById.get(card.client_id) ?? null
                    : null
                }
                assigneeName={
                  card.assignee_id
                    ? assigneeNameById.get(card.assignee_id) ?? null
                    : null
                }
                checklist={checklistProgress(card.id, checklistItems)}
                showApproval={isApprovalColumn(column.name)}
                draggable={draggable}
                onOpen={() => onOpenCard(card.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </div>

      <QuickAddCard columnId={column.id} />
    </div>
  );
}

// ----------------------------------------------------------------- board

export function Board({
  board,
  tabs,
}: {
  board: BacklogBoard;
  /** Abas Kanban/Calendário, renderizadas pela página. */
  tabs?: React.ReactNode;
}) {
  const [columns, setColumns] = useState(board.columns);
  const [cards, setCards] = useState(board.cards);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  const [filter, setFilter] = useState<BacklogFilter>(EMPTY_BACKLOG_FILTER);

  // O servidor é a fonte da verdade: cada revalidação sobrescreve o estado
  // otimista deixado pelo arraste. Ajuste durante o render (e não num efeito)
  // pra não disparar um render em cascata a cada revalidação.
  const [renderedBoard, setRenderedBoard] = useState(board);
  if (renderedBoard !== board) {
    setRenderedBoard(board);
    setColumns(board.columns);
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

  // O slider substitui a barra de rolagem nativa do quadro. `maxScroll` fica
  // em 0 quando as colunas cabem na tela — aí o slider some.
  const syncScroll = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;
    setScrollLeft(element.scrollLeft);
    setMaxScroll(Math.max(0, element.scrollWidth - element.clientWidth));
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    syncScroll();
    const observer = new ResizeObserver(syncScroll);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, [syncScroll, columns.length]);

  const filtering = countBacklogFilters(filter) > 0;

  const visibleCards = useMemo(
    () => filterBacklogCards(cards, filter, board.checklist),
    [cards, filter, board.checklist]
  );

  function columnCards(columnId: string, source: BacklogCard[]) {
    return source
      .filter((card) => card.column_id === columnId)
      .sort((a, b) => a.position - b.position);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "card") {
      setActiveCardId(String(event.active.id));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId && active.data.current?.type === "column") return;

    if (active.data.current?.type === "column") {
      const from = columns.findIndex((column) => column.id === activeId);
      const to = columns.findIndex((column) => column.id === overId);
      if (from === -1 || to === -1 || from === to) return;

      const next = arrayMove(columns, from, to);
      setColumns(next);
      void reorderBacklogColumnsAction(next.map((column) => column.id));
      return;
    }

    const card = cards.find((item) => item.id === activeId);
    if (!card) return;

    const targetColumnId = overId.startsWith(DROPZONE_PREFIX)
      ? overId.slice(DROPZONE_PREFIX.length)
      : cards.find((item) => item.id === overId)?.column_id ??
        columns.find((column) => column.id === overId)?.id;
    if (!targetColumnId) return;

    const sourceColumnId = card.column_id;
    const sourceIds = columnCards(sourceColumnId, cards).map((item) => item.id);
    const targetIds =
      sourceColumnId === targetColumnId
        ? sourceIds
        : columnCards(targetColumnId, cards).map((item) => item.id);

    let orderedIdsByColumn: Record<string, string[]>;

    if (sourceColumnId === targetColumnId) {
      const from = sourceIds.indexOf(activeId);
      const to = sourceIds.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return;
      orderedIdsByColumn = { [targetColumnId]: arrayMove(sourceIds, from, to) };
    } else {
      const nextSource = sourceIds.filter((id) => id !== activeId);
      const overIndex = targetIds.indexOf(overId);
      const nextTarget = [...targetIds];
      nextTarget.splice(overIndex === -1 ? nextTarget.length : overIndex, 0, activeId);
      orderedIdsByColumn = {
        [sourceColumnId]: nextSource,
        [targetColumnId]: nextTarget,
      };
    }

    // Estado otimista: o quadro reflete o arraste antes da resposta do banco.
    setCards((current) =>
      current.map((item) => {
        for (const [columnId, ids] of Object.entries(orderedIdsByColumn)) {
          const index = ids.indexOf(item.id);
          if (index !== -1) {
            return { ...item, column_id: columnId, position: index };
          }
        }
        return item;
      })
    );

    void moveBacklogCardAction({
      cardId: activeId,
      toColumnId: targetColumnId,
      orderedIdsByColumn,
    }).then((result) => {
      // Automação: a transição casou com a regra, então pergunta na hora.
      if (result?.question) {
        askBacklogQuestion(result.question, {
          cardId: card.id,
          cardTitle: card.title,
        });
      }
    });
  }

  const openCard = openCardId
    ? cards.find((card) => card.id === openCardId) ?? null
    : null;
  const activeCard = activeCardId
    ? cards.find((card) => card.id === activeCardId) ?? null
    : null;

  return (
    <>
      <BacklogToaster />

      {/* Abas, filtro e configurações do quadro na mesma linha — a barra
          branca separada só criava um vão vazio no meio. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div>{tabs}</div>
        <div className="ml-auto flex items-center gap-2">
          <BacklogFilters
            filter={filter}
            onChange={setFilter}
            clients={board.clients}
            users={board.users}
            align="end"
          />
          <BoardSettingsMenu />
        </div>
      </div>

      {filtering ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Arrastar fica desativado enquanto há filtro ativo, pra não reordenar o
          quadro com base numa visão parcial. Limpe os filtros pra mover cards.
        </p>
      ) : null}

      <DndContext
        // Id fixo: sem ele o dnd-kit gera os ids de acessibilidade por
        // contador, que sai diferente no servidor e no cliente e quebra a
        // hidratação.
        id="backlog-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCardId(null)}
      >
        <SortableContext
          items={columns.map((column) => column.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Fades nas bordas: só aparecem do lado que ainda tem coluna
                escondida, pra sinalizar que dá pra rolar. */}
            {scrollLeft > 1 ? (
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
            ) : null}
            {scrollLeft < maxScroll - 1 ? (
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />
            ) : null}

            <div
              ref={scrollerRef}
              onScroll={syncScroll}
              onWheel={(event) => {
                // Mouse comum só manda deltaY: sem isto, a roda não rolaria
                // o quadro em lugar nenhum. Trackpad (deltaX) segue nativo.
                const element = scrollerRef.current;
                if (!element || event.deltaX !== 0 || event.deltaY === 0) return;
                element.scrollLeft += event.deltaY;
              }}
              // Barra nativa escondida: quem rola é o slider no fim da página.
              className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  cards={columnCards(column.id, visibleCards)}
                  clientNameById={clientNameById}
                  assigneeNameById={assigneeNameById}
                  checklistItems={board.checklist}
                  draggable={!filtering}
                  onOpenCard={setOpenCardId}
                />
              ))}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard ? (
            <CardBody
              card={activeCard}
              clientName={
                activeCard.client_id
                  ? clientNameById.get(activeCard.client_id) ?? null
                  : null
              }
              assigneeName={
                activeCard.assignee_id
                  ? assigneeNameById.get(activeCard.assignee_id) ?? null
                  : null
              }
              checklist={checklistProgress(activeCard.id, board.checklist)}
              showApproval={false}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {maxScroll > 0 ? (
        // `mt-auto` empurra pro fim da página; `px-1.5` mantém a bolinha
        // inteira dentro da moldura nas duas pontas.
        <div className="mt-auto px-1.5 pb-1 pt-6">
          <Slider
            value={[Math.min(scrollLeft, maxScroll)]}
            min={0}
            max={maxScroll}
            step={1}
            aria-label="Rolar o quadro na horizontal"
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (scrollerRef.current) scrollerRef.current.scrollLeft = next;
            }}
          />
        </div>
      ) : null}

      {columns.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhuma coluna ainda. Crie a primeira no formulário acima.
        </p>
      ) : null}

      {openCard ? (
        <BacklogCardDrawer
          card={openCard}
          checklist={board.checklist}
          activity={board.activity}
          isFirstColumn={columns[0]?.id === openCard.column_id}
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
    </>
  );
}
