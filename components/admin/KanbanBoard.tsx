"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { Copy } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { BacklogCardDrawer } from "@/components/admin/BacklogCardDrawer";
import { BacklogCardView } from "@/components/admin/BacklogCardView";
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
  CONTRACT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type BacklogBoard,
  type BacklogCard,
  type BacklogBoardKind,
  type BacklogChecklistItem,
  type BacklogColumn,
  type BacklogFilter,
} from "@/lib/backlogTypes";
import { formatBRL, lineTotalCents } from "@/lib/billingTypes";
import { BOARD_NOUNS, type BoardNouns } from "@/lib/boardNouns";
import {
  createBacklogCardAction,
  createBacklogColumnAction,
  deleteBacklogCardAction,
  duplicateBacklogCardAction,
  deleteBacklogColumnAction,
  moveBacklogCardAction,
  reorderBacklogColumnsAction,
  setBacklogCardApprovedAction,
  updateBacklogCardAction,
  updateBacklogColumnAction,
} from "@/app/admin/kanbanActions";

const DROPZONE_PREFIX = "dropzone-";

/**
 * Agrupa os cards por cliente mantendo a ordem em que aparecem. A lista final
 * continua linear — é a mesma que alimenta o `SortableContext` —, então o
 * arraste segue funcionando; o que muda é que os cards do mesmo cliente ficam
 * vizinhos e ganham um cabeçalho.
 */
function groupByClient(
  cards: BacklogCard[],
  clientNameById: Map<string, string>
): { name: string; cards: BacklogCard[] }[] {
  const groups = new Map<string, BacklogCard[]>();

  for (const card of cards) {
    const name =
      (card.client_id ? clientNameById.get(card.client_id) : null) ??
      "Sem cliente";
    const list = groups.get(name);
    if (list) list.push(card);
    else groups.set(name, [card]);
  }

  return [...groups.entries()].map(([name, list]) => ({ name, cards: list }));
}

/** Ids de responsáveis viram nomes; quem foi excluído some da lista. */
function namesOf(ids: string[], nameById: Map<string, string>): string[] {
  return ids
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name));
}

/**
 * Vocabulário do quadro. Vive num contexto porque só as folhas da árvore
 * (formulário de adicionar, estado vazio, aviso de exclusão) precisam dele, e
 * passar o par de strings por quatro níveis de props não deixaria nada mais
 * claro. O padrão é o do Instagram, que é o quadro original.
 */
const BoardNounsContext = createContext<BoardNouns>(BOARD_NOUNS.instagram);

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

// ------------------------------------------------------------------ card

function CardBody({
  card,
  clientName,
  assigneeNames,
  checklist,
  showApproval = false,
  compact = false,
  onOpen,
  onDuplicate,
}: {
  card: BacklogCard;
  clientName: string | null;
  assigneeNames: string[];
  checklist: { done: number; total: number } | null;
  /** Só na coluna de aprovação o material pode ser marcado como aprovado. */
  showApproval?: boolean;
  /**
   * Quadro de entregas: o card mostra quem, o quê, quando e o tipo de
   * contrato. Valor, Drive e WhatsApp continuam no card aberto — no quadro
   * eles só disputavam atenção com o que se procura de relance.
   */
  compact?: boolean;
  onOpen?: () => void;
  /** Duplicar só faz sentido no quadro, não no card fantasma do arraste. */
  onDuplicate?: () => void;
}) {
  const approved = Boolean(card.approved_at);

  return (
    <div
      className={`group/card relative rounded-md border bg-white shadow-sm ${
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
      {onDuplicate ? (
        <button
          type="button"
          // `stopPropagation` porque o card inteiro é a alça de arraste.
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
          aria-label={`Duplicar "${card.title}"`}
          className="absolute top-1 right-1 z-10 grid size-7 place-items-center rounded-md text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-800 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none group-hover/card:opacity-100 pointer-coarse:opacity-100"
        >
          <Copy className="size-3.5" aria-hidden />
        </button>
      ) : null}

      <div className="p-2.5">
        {/* `pr-7` reserva a área do botão de duplicar: sem isso ele cobria a
            última palavra dos títulos que quebram em duas linhas. */}
        <div className={`flex items-start gap-2 ${onDuplicate ? "pr-7" : ""}`}>
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
          {/* Quem é o cliente vem antes do título: é o que se procura ao
              bater o olho num quadro cheio. */}
          <button
            type="button"
            onClick={onOpen}
            className={`block flex-1 text-left text-sm hover:underline ${
              approved ? "text-neutral-500 line-through" : "text-neutral-900"
            }`}
          >
            {clientName ? (
              <span className="mr-1.5 rounded bg-sky-50 px-1.5 py-0.5 align-[0.05em] text-[11px] font-medium text-sky-700">
                {clientName}
              </span>
            ) : null}
            <span className="font-medium">{card.title}</span>
          </button>
        </div>

        {/* No desktop os detalhes só aparecem com o mouse em cima: o quadro
            cheio fica legível de longe, e quem quer o detalhe se aproxima.
            Onde não existe hover (dedo), continuam sempre visíveis. */}
        <div
          className={`mt-1.5 flex-wrap items-center gap-1 ${
            compact
              ? "hidden group-hover/card:flex group-focus-within/card:flex pointer-coarse:flex"
              : "flex"
          }`}
        >
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
            {BACKLOG_FORMAT_LABELS[card.format]}
          </span>
          {card.contract_type ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] ${
                card.contract_type === "mensal"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-orange-50 text-orange-700"
              }`}
            >
              {CONTRACT_TYPE_LABELS[card.contract_type]}
            </span>
          ) : null}
          {assigneeNames.map((name) => (
            <span
              key={name}
              className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700"
            >
              @{name}
            </span>
          ))}
          {card.post_date ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
              {formatBacklogDateShort(card.post_date)}
            </span>
          ) : null}
          {card.unit_price_cents !== null && !compact ? (
            <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[11px] text-white tabular-nums">
              {card.quantity > 1 ? `${card.quantity}× ` : ""}
              {formatBRL(lineTotalCents(card))}
            </span>
          ) : null}
          {/* Basta a data para o selo aparecer: uma entrega paga sem forma
              anotada continua sendo uma entrega paga. */}
          {card.paid_at || card.payment_method ? (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
              Pago
              {card.paid_at ? ` ${formatBacklogDateShort(card.paid_at)}` : ""}
              {card.payment_method
                ? ` · ${PAYMENT_METHOD_LABELS[card.payment_method]}`
                : ""}
            </span>
          ) : null}
          {card.sent_whatsapp && !compact ? (
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

        {card.tags.length > 0 && !compact ? (
          <p className="mt-1 truncate text-[11px] text-neutral-400">
            {card.tags.map((tag) => `#${tag}`).join(" ")}
          </p>
        ) : null}

        {card.drive_url && !compact ? (
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
  assigneeNames,
  checklist,
  showApproval,
  compact,
  draggable,
  onOpen,
  onDuplicate,
}: {
  card: BacklogCard;
  clientName: string | null;
  assigneeNames: string[];
  checklist: { done: number; total: number } | null;
  showApproval: boolean;
  compact: boolean;
  draggable: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
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
        assigneeNames={assigneeNames}
        checklist={checklist}
        showApproval={showApproval}
        compact={compact}
        onOpen={onOpen}
        onDuplicate={onDuplicate}
      />
    </li>
  );
}

/** Ações do quadro que não são do dia a dia — hoje, criar coluna. */
function BoardSettingsMenu({ boardKind }: { boardKind: BacklogBoardKind }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Configurações do quadro"
            className="flex size-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50 pointer-coarse:size-11"
          >
            ⚙
          </button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-semibold text-neutral-900">Nova coluna</p>
        <form action={createBacklogColumnAction} className="flex flex-col gap-2">
          <input type="hidden" name="board" value={boardKind} />
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
  const nouns = useContext(BoardNounsContext);

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
        placeholder={nouns.novo}
        disabled={pending}
        className="min-w-0 flex-1 rounded-md border border-dashed border-neutral-300 bg-white/60 px-2.5 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={pending}
        aria-label={nouns.novo}
        className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
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
  const nouns = useContext(BoardNounsContext);

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
        {column.board === "entregas" ? (
          <div className="flex flex-col gap-1.5">
            {/* Campo-sentinela: sem ele um checkbox desmarcado sumiria do
                FormData e a ação não saberia diferenciar "desmarcou" de
                "esse quadro não tem o campo". */}
            <input type="hidden" name="billable_present" value="1" />
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input
                type="checkbox"
                name="billable"
                defaultChecked={column.billable}
                className="size-3.5"
              />
              Conta como entrega na nota do mês
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input
                type="checkbox"
                name="paid"
                defaultChecked={column.paid}
                className="size-3.5"
              />
              O pagamento já entrou
            </label>
          </div>
        ) : null}
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
                  `Excluir a coluna "${column.name}"? ${nouns.contagemExcluida(count)} junto.`
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
      {/* `title` é tooltip de mouse e não existe no celular, que é onde o
          fechamento do mês costuma ser conferido — então o rótulo precisa se
          explicar sozinho. */}
      {column.billable ? (
        column.paid ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
            na nota · pago
          </span>
        ) : (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
            na nota · a receber
          </span>
        )
      ) : null}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="ml-auto rounded-md text-xs text-neutral-500 opacity-0 transition-opacity hover:text-neutral-800 focus-visible:opacity-100 group-hover/header:opacity-100 pointer-coarse:opacity-100 pointer-coarse:min-h-11 pointer-coarse:px-2 pointer-coarse:inline-flex pointer-coarse:items-center focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
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
  onDuplicateCard,
}: {
  column: BacklogColumn;
  cards: BacklogCard[];
  clientNameById: Map<string, string>;
  assigneeNameById: Map<string, string>;
  checklistItems: BacklogChecklistItem[];
  draggable: boolean;
  onOpenCard: (id: string) => void;
  onDuplicateCard: (id: string) => void;
}) {
  const nouns = useContext(BoardNounsContext);
  const compact = column.board === "entregas";
  // A coluna de quem já entregou e ainda não recebeu é a que enche: agrupada
  // por cliente, ela responde "quanto o fulano me deve" de relance.
  const agrupar = column.board === "entregas" && column.billable && !column.paid;
  const groups = agrupar
    ? groupByClient(cards, clientNameById)
    : [{ name: "", cards }];
  const orderedCards = groups.flatMap((group) => group.cards);
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
          items={orderedCards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
              {nouns.nenhum}
            </p>
          ) : null}

          {groups.map((group) => (
            <div key={group.name} className="mb-2 last:mb-0">
              {agrupar ? (
                <div className="mb-1 flex items-baseline justify-between gap-2 px-0.5">
                  <span className="truncate text-xs font-semibold text-neutral-700">
                    {group.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-neutral-500 tabular-nums">
                    {group.cards.length} ·{" "}
                    {formatBRL(
                      group.cards.reduce(
                        (total, card) => total + lineTotalCents(card),
                        0
                      )
                    )}
                  </span>
                </div>
              ) : null}

              <ul className="flex flex-col gap-2">
                {group.cards.map((card) => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    clientName={
                      card.client_id
                        ? clientNameById.get(card.client_id) ?? null
                        : null
                    }
                    assigneeNames={namesOf(card.assignee_ids, assigneeNameById)}
                    compact={compact}
                    onDuplicate={() => onDuplicateCard(card.id)}
                    checklist={checklistProgress(card.id, checklistItems)}
                    showApproval={isApprovalColumn(column.name)}
                    draggable={draggable}
                    onOpen={() => onOpenCard(card.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </SortableContext>
      </div>

      <QuickAddCard columnId={column.id} />
    </div>
  );
}

// ----------------------------------------------------------------- board

/**
 * Kanban compartilhado pelos dois quadros — o backlog do Instagram e as
 * entregas de cliente. O que muda entre eles vem de `board.board`: quais
 * colunas existem, se o card tem cobrança e para onde vão as colunas novas.
 */

export function KanbanBoard({
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
  // Clicar no card abre a visualização; o botão "Editar" dela abre o form.
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

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

  /**
   * A cópia entra no fim da mesma coluna. Não há estado otimista aqui: o card
   * novo vem do banco com id próprio, e inventar um id no cliente só criaria
   * um fantasma para reconciliar depois.
   */
  function handleDuplicate(cardId: string) {
    void duplicateBacklogCardAction(cardId);
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
      if (result?.prompt) {
        askBacklogQuestion(result.prompt, {
          cardId: card.id,
          cardTitle: card.title,
        });
      }
    });
  }

  const editingCard = editingCardId
    ? cards.find((card) => card.id === editingCardId) ?? null
    : null;
  const openCard = openCardId
    ? cards.find((card) => card.id === openCardId) ?? null
    : null;
  const activeCard = activeCardId
    ? cards.find((card) => card.id === activeCardId) ?? null
    : null;

  // Enquanto o quadro está sendo mexido (arraste, card aberto ou em edição) a
  // atualização automática espera: sobrescrever as colunas no meio da interação
  // faria o card saltar de volta.
  const interacting = Boolean(activeCardId || openCardId || editingCardId);

  return (
    <BoardNounsContext.Provider value={BOARD_NOUNS[board.board]}>
      {interacting ? <span hidden data-live-pause /> : null}
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
          <BoardSettingsMenu boardKind={board.board} />
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
                  onDuplicateCard={handleDuplicate}
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
              assigneeNames={namesOf(
                activeCard.assignee_ids,
                assigneeNameById
              )}
              compact={board.board === "entregas"}
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

      {openCard && !editingCard ? (
        <BacklogCardView
          card={openCard}
          checklist={board.checklist}
          activity={board.activity}
          columnName={
            columns.find((column) => column.id === openCard.column_id)?.name ??
            ""
          }
          columnColor={
            columns.find((column) => column.id === openCard.column_id)?.color ??
            "#6b7280"
          }
          clientName={
            openCard.client_id
              ? clientNameById.get(openCard.client_id) ?? null
              : null
          }
          assigneeNames={namesOf(openCard.assignee_ids, assigneeNameById)}
          guideTitle={
            board.guides.find((guide) => guide.id === openCard.guide_id)
              ?.title ?? null
          }
          authorNameById={assigneeNameById}
          canComment={columns[0]?.id !== openCard.column_id}
          showBilling={board.board === "entregas"}
          onClose={() => setOpenCardId(null)}
          onEdit={() => setEditingCardId(openCard.id)}
        />
      ) : null}

      {editingCard ? (
        <BacklogCardDrawer
          card={editingCard}
          checklist={board.checklist}
          activity={board.activity}
          isFirstColumn={columns[0]?.id === editingCard.column_id}
          clients={board.clients}
          guides={board.guides}
          users={board.users}
          services={board.services}
          showBilling={board.board === "entregas"}
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
    </BoardNounsContext.Provider>
  );
}
