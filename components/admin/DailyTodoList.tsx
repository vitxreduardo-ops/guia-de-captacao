"use client";

import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useReducedMotion } from "motion/react";
import {
  createDailyTodoAction,
  deleteDailyTodoAction,
  reorderDailyTodosAction,
  setDailyTodoAssigneesAction,
  setDailyTodoChecklistItemDoneAction,
  setDailyTodoDoneAction,
  updateDailyTodoDetailsAction,
} from "@/app/admin/actions";
import { Accordion } from "@/components/Accordion";
import { TodoAssigneeMenu } from "@/components/admin/TodoAssigneeMenu";
import { TodoDrawer } from "@/components/admin/TodoDrawer";
import {
  TODO_PRIORITY_CLASSES,
  TODO_PRIORITY_LABELS,
  TODO_RETENTION_DAYS,
  type DailyTodoView,
  type TodoPriority,
  type TodoUser,
} from "@/lib/dailyTodoTypes";
import { projectMomentum, rubberband, sampleSpring } from "@/lib/springMotion";

/** Dia em que a tarefa concluída sai da lista sozinha. */
function expiryLabel(completedAt: string) {
  const expiry = new Date(completedAt);
  expiry.setDate(expiry.getDate() + TODO_RETENTION_DAYS);
  return expiry.toLocaleDateString("pt-BR");
}

/** Prazo em dia/mês: o ano quase sempre é o corrente e só ocuparia a linha. */
function dueLabel(dueDate: string) {
  const [year, month, day] = dueDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Prazo vencido só conta pra tarefa pendente — atrasar depois de feita não é atraso. */
function isOverdue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dueDate.split("-").map(Number);
  return new Date(year, month - 1, day).getTime() < today.getTime();
}

/** Segundos que a tarefa excluída fica recuperável antes de ir pro banco. */
const UNDO_WINDOW_MS = 8000;

/** Tempo da linha sair de vista ao ser marcada — curto, só pra indicar destino. */
const HANDOFF_MS = 180;

/** Janela em que a mola de soltura toca. Além disso ela já está em repouso. */
const DROP_MS = 400;

type TodoDetails = {
  text: string;
  notes: string;
  dueDate: string | null;
  priority: TodoPriority;
};

type OptimisticAction =
  | { type: "create"; text: string; user: TodoUser | null }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "details"; id: string; fields: TodoDetails }
  | { type: "assign"; id: string; assignees: TodoUser[] }
  | { type: "reorder"; orderedIds: string[] }
  | { type: "delete"; id: string };

/**
 * Pendente primeiro. Dentro do grupo vale a ordem manual do arraste; entre as
 * concluídas, a última a ser fechada fica no topo — que é a ordem do dropdown.
 */
function sorted(todos: DailyTodoView[]) {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    if (a.done) {
      return (b.completed_at ?? "").localeCompare(a.completed_at ?? "");
    }
    return a.position - b.position || a.created_at.localeCompare(b.created_at);
  });
}

function reduce(
  todos: DailyTodoView[],
  action: OptimisticAction
): DailyTodoView[] {
  switch (action.type) {
    case "create":
      return sorted([
        ...todos,
        {
          // Id temporário: o servidor devolve o definitivo na revalidação.
          id: `optimistic-${Date.now()}`,
          text: action.text,
          notes: "",
          done: false,
          due_date: null,
          priority: 2,
          // Entra no fim da fila pendente, igual ao que o servidor grava.
          position: Math.max(-1, ...todos.map((todo) => todo.position)) + 1,
          completed_at: null,
          created_by: action.user?.id ?? null,
          completed_by: null,
          created_at: new Date().toISOString(),
          created_by_username: action.user?.username ?? null,
          assignees: action.user ? [action.user] : [],
          checklist: [],
        },
      ]);
    case "toggle":
      return sorted(
        todos.map((todo) =>
          todo.id === action.id
            ? {
                ...todo,
                done: action.done,
                completed_at: action.done ? new Date().toISOString() : null,
              }
            : todo
        )
      );
    case "details":
      return todos.map((todo) =>
        todo.id === action.id
          ? {
              ...todo,
              text: action.fields.text,
              notes: action.fields.notes,
              due_date: action.fields.dueDate,
              priority: action.fields.priority,
            }
          : todo
      );
    case "assign":
      return todos.map((todo) =>
        todo.id === action.id ? { ...todo, assignees: action.assignees } : todo
      );
    case "reorder":
      return sorted(
        todos.map((todo) => {
          const index = action.orderedIds.indexOf(todo.id);
          return index === -1 ? todo : { ...todo, position: index };
        })
      );
    case "delete":
      return todos.filter((todo) => todo.id !== action.id);
  }
}

/**
 * Resistência nas pontas da lista: passar do topo ou do fim continua movendo o
 * item, só que cada vez menos. Parar duro no limite lê como travamento.
 */
const rubberbandVertical: Modifier = ({
  transform,
  draggingNodeRect,
  containerNodeRect,
}) => {
  if (!draggingNodeRect || !containerNodeRect) return transform;

  const top = draggingNodeRect.top + transform.y;
  const bottom = draggingNodeRect.bottom + transform.y;
  const height = containerNodeRect.height;

  if (top < containerNodeRect.top) {
    const overshoot = containerNodeRect.top - top;
    return {
      ...transform,
      y: transform.y + overshoot - rubberband(overshoot, height),
    };
  }

  if (bottom > containerNodeRect.bottom) {
    const overshoot = bottom - containerNodeRect.bottom;
    return {
      ...transform,
      y: transform.y - overshoot + rubberband(overshoot, height),
    };
  }

  return transform;
};

export function DailyTodoList({
  todos,
  users,
  currentUser,
}: {
  todos: DailyTodoView[];
  users: TodoUser[];
  currentUser: TodoUser | null;
}) {
  const [optimisticTodos, apply] = useOptimistic(todos, reduce);
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [openTodo, setOpenTodo] = useState<{
    id: string;
    origin: { x: number; y: number } | null;
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flying, setFlying] = useState<{ id: string; done: boolean } | null>(
    null
  );
  const [completedPulse, setCompletedPulse] = useState(false);
  const [trashed, setTrashed] = useState<DailyTodoView | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  // Velocidade do dedo no instante da soltura: sem ela o item pousa igual num
  // arrasto lento e num peteleco.
  const pointerTrail = useRef<{ y: number; time: number }[]>([]);
  const releaseVelocity = useRef(0);

  /** Toda mutação pinta a tela primeiro e só depois espera o servidor. */
  const mutate = useCallback(
    (optimistic: OptimisticAction, run: () => Promise<void>) => {
      startTransition(async () => {
        apply(optimistic);
        await run();
      });
    },
    [apply]
  );

  function create() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    inputRef.current?.focus();
    mutate({ type: "create", text, user: currentUser }, () =>
      createDailyTodoAction(text)
    );
  }

  /**
   * Marcar dá o destino antes de mudar o estado: a linha sai na direção do
   * bloco de concluídas (ou volta pra cima, ao desmarcar) e só então a lista
   * muda. Sem esse trecho a tarefa some de um lugar e reaparece em outro, sem
   * dizer para onde foi.
   */
  function toggle(todo: DailyTodoView) {
    const done = !todo.done;
    const commit = () =>
      mutate({ type: "toggle", id: todo.id, done }, () =>
        setDailyTodoDoneAction(todo.id, done)
      );

    if (reduceMotion) {
      commit();
      if (done) pulseCompleted();
      return;
    }

    setFlying({ id: todo.id, done });
    window.setTimeout(() => {
      setFlying(null);
      commit();
      if (done) pulseCompleted();
    }, HANDOFF_MS);
  }

  function pulseCompleted() {
    setCompletedPulse(true);
    window.setTimeout(() => setCompletedPulse(false), 700);
  }

  function assign(todo: DailyTodoView, assignees: TodoUser[]) {
    mutate({ type: "assign", id: todo.id, assignees }, () =>
      setDailyTodoAssigneesAction(
        todo.id,
        assignees.map((user) => user.id)
      )
    );
  }

  // A exclusão fica retida enquanto o aviso está na tela: desfazer é só não
  // mandar. Confirmar antes de toda exclusão treina a pessoa a clicar sem ler;
  // aqui o erro custa um clique em "Desfazer", não um diálogo por vez.
  const commitDelete = useCallback(
    (todo: DailyTodoView) => {
      mutate({ type: "delete", id: todo.id }, () =>
        deleteDailyTodoAction(todo.id)
      );
    },
    [mutate]
  );

  const trashTimer = useRef<number | null>(null);
  const pendingDelete = useRef<DailyTodoView | null>(null);

  const flushDelete = useCallback(() => {
    if (trashTimer.current) window.clearTimeout(trashTimer.current);
    trashTimer.current = null;
    const todo = pendingDelete.current;
    pendingDelete.current = null;
    setTrashed(null);
    if (todo) commitDelete(todo);
  }, [commitDelete]);

  function requestDelete(todo: DailyTodoView) {
    // Já havia uma esperando: aquela vai agora, e a vez é desta.
    flushDelete();
    pendingDelete.current = todo;
    setTrashed(todo);
    setOpenTodo(null);
    trashTimer.current = window.setTimeout(flushDelete, UNDO_WINDOW_MS);
  }

  function undoDelete() {
    if (trashTimer.current) window.clearTimeout(trashTimer.current);
    trashTimer.current = null;
    pendingDelete.current = null;
    setTrashed(null);
  }

  // Sair da página com uma exclusão retida não pode ressuscitar a tarefa: o
  // que a pessoa viu foi "excluída", e o silêncio até aqui era só a janela de
  // desfazer.
  useEffect(
    () => () => {
      if (trashTimer.current) window.clearTimeout(trashTimer.current);
      if (pendingDelete.current) {
        void deleteDailyTodoAction(pendingDelete.current.id);
      }
    },
    []
  );

  // Ordena sempre no render, não só nas mutações otimistas: o servidor devolve
  // tudo por position, e as concluídas precisam da última fechada no topo.
  const visible = sorted(optimisticTodos).filter(
    (todo) => todo.id !== trashed?.id
  );
  const pending = visible.filter((todo) => !todo.done);
  const done = visible.filter((todo) => todo.done);
  const editing = openTodo
    ? optimisticTodos.find((todo) => todo.id === openTodo.id) ?? null
    : null;
  const activeTodo = activeId
    ? pending.find((todo) => todo.id === activeId) ?? null
    : null;

  const sensors = useSensors(
    // Sem a distância mínima, o clique que abre o painel viraria arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // A alça é focável: sem este sensor ela receberia foco e não faria nada no
    // teclado. Espaço pega a tarefa, setas movem, Espaço solta.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function trackPointer(event: PointerEvent) {
    const trail = pointerTrail.current;
    trail.push({ y: event.clientY, time: event.timeStamp });
    // Só os últimos milissegundos importam: velocidade média do arrasto
    // inteiro ignoraria uma freada logo antes de soltar.
    while (trail.length > 6) trail.shift();
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    pointerTrail.current = [];
    releaseVelocity.current = 0;
    window.addEventListener("pointermove", trackPointer);
  }

  function readVelocity() {
    window.removeEventListener("pointermove", trackPointer);
    const trail = pointerTrail.current;
    if (trail.length < 2) return 0;
    const first = trail[0];
    const last = trail[trail.length - 1];
    const elapsed = last.time - first.time;
    if (elapsed <= 0) return 0;
    return ((last.y - first.y) / elapsed) * 1000; // px/s
  }

  function handleDragEnd(event: DragEndEvent) {
    const velocity = readVelocity();
    releaseVelocity.current = velocity;
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const ids = pending.map((todo) => todo.id);
    const from = ids.indexOf(String(active.id));
    let to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    // Peteleco arremessa: o destino é onde o gesto ia parar, não onde o dedo
    // soltou. Abaixo de 300px/s isso é ruído de mão, e a posição vale como está.
    const rowHeight =
      (event.active.rect.current.translated?.height ?? 0) + 4 || 48;
    if (Math.abs(velocity) > 300) {
      const projected = projectMomentum(velocity) / rowHeight;
      to = Math.min(
        ids.length - 1,
        Math.max(0, to + Math.trunc(projected))
      );
    }

    if (from === to) return;

    const orderedIds = arrayMove(ids, from, to);
    mutate({ type: "reorder", orderedIds }, () =>
      reorderDailyTodosAction(orderedIds)
    );
  }

  function handleDragCancel() {
    readVelocity();
    setActiveId(null);
  }

  const completedList =
    done.length > 0 ? (
      <ul className="space-y-1 border-t border-neutral-200 p-2">
        {done.map((todo) => (
          <li
            key={todo.id}
            className={rowMotionClass(flying, todo.id, reduceMotion)}
          >
            <TodoRow
              todo={todo}
              users={users}
              onOpen={(origin) => setOpenTodo({ id: todo.id, origin })}
              onToggle={() => toggle(todo)}
              onAssign={(assignees) => assign(todo, assignees)}
              onDelete={() => requestDelete(todo)}
            />
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="space-y-3">
      {/* O contador vive no título, não no rodapé: é a informação mais útil do
          bloco e estava renderizada como a menos importante. Fica aqui dentro
          pra acompanhar o estado otimista. */}
      <h2
        id="tarefas-titulo"
        className="text-sm font-semibold tracking-tight text-neutral-900"
      >
        Tarefas
        {visible.length > 0 ? (
          <span className="font-normal tracking-normal text-neutral-500">
            {pending.length === 0
              ? " · tudo feito"
              : ` · ${pending.length} pendente${pending.length > 1 ? "s" : ""}`}
          </span>
        ) : null}
      </h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nova tarefa"
          aria-label="Nova tarefa"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:border-neutral-500 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-transform hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
        >
          Adicionar
        </button>
      </form>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm leading-relaxed text-neutral-500">
          Nenhuma tarefa por aqui.
          <br />
          Escreva a primeira no campo acima.
        </p>
      ) : null}

      {pending.length > 0 ? (
        <DndContext
          // Id fixo: sem ele o dnd-kit numera os textos de acessibilidade em
          // ordem de montagem, e servidor e cliente chegam a números
          // diferentes — o React acusa divergência de hidratação.
          id="daily-todos"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[rubberbandVertical]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={pending.map((todo) => todo.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {pending.map((todo) => (
                <SortableTodoRow
                  key={todo.id}
                  todo={todo}
                  users={users}
                  flying={flying}
                  reduceMotion={Boolean(reduceMotion)}
                  onOpen={(origin) => setOpenTodo({ id: todo.id, origin })}
                  onToggle={() => toggle(todo)}
                  onAssign={(assignees) => assign(todo, assignees)}
                  onDelete={() => requestDelete(todo)}
                />
              ))}
            </ul>
          </SortableContext>

          {/* A linha arrastada é uma camada por cima da lista, com sombra e um
              toque de escala: é o que faz o item parecer levantado da pilha em
              vez de apagado no meio dela. */}
          <DragOverlay
            dropAnimation={{
              // As keyframes carregam o formato da mola; a duração aqui é só a
              // janela em que elas tocam, e a simulação é cortada no mesmo
              // tempo pra não sobrar nem faltar quadro.
              duration: DROP_MS,
              easing: "linear",
              keyframes: ({ transform }) => {
                if (reduceMotion) {
                  return [
                    { transform: CSS.Transform.toString(transform.initial) },
                    { transform: CSS.Transform.toString(transform.final) },
                  ];
                }

                // Eixos independentes: uma mola só na distância dessincroniza
                // quando X e Y chegam com velocidades diferentes.
                const y = sampleSpring({
                  from: transform.initial.y,
                  to: transform.final.y,
                  velocity: releaseVelocity.current,
                  // Bounce só porque o gesto trouxe momentum — o mesmo
                  // sobressalto num painel que só apareceu ficaria estranho.
                  bounce: Math.abs(releaseVelocity.current) > 300 ? 0.2 : 0,
                  response: 0.4,
                  maxDuration: DROP_MS / 1000,
                });
                const x = sampleSpring({
                  from: transform.initial.x,
                  to: transform.final.x,
                  bounce: 0,
                  response: 0.4,
                  maxDuration: DROP_MS / 1000,
                });

                const frames = Math.max(y.values.length, x.values.length);
                return Array.from({ length: frames }, (_, index) => ({
                  transform: `translate3d(${
                    x.values[Math.min(index, x.values.length - 1)]
                  }px, ${
                    y.values[Math.min(index, y.values.length - 1)]
                  }px, 0) scale(1)`,
                }));
              },
            }}
          >
            {activeTodo ? (
              <div className="scale-[1.02] cursor-grabbing rounded-md shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-900/5">
                <TodoRow
                  todo={activeTodo}
                  users={users}
                  onOpen={() => {}}
                  onToggle={() => {}}
                  onAssign={() => {}}
                  onDelete={() => {}}
                  dragHandle={<DragHandleIcon label={null} />}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}

      {completedList ? (
        // Mesmo acordeão dos Atalhos: dois blocos que abrem do mesmo jeito na
        // mesma tela. Antes este era um <details> nativo, que abria seco
        // enquanto o de cima deslizava.
        <div
          className={`rounded-lg transition-shadow ${
            completedPulse ? "ring-2 ring-emerald-500/40" : "ring-0"
          }`}
        >
          <Accordion
            summary={
              <span className="text-sm text-neutral-600">
                Concluídas{" "}
                <span className="text-neutral-500">({done.length})</span>
              </span>
            }
            className="rounded-md border border-neutral-200"
            buttonClassName="px-3 py-2"
          >
            {completedList}
          </Accordion>
        </div>
      ) : null}

      {editing ? (
        <TodoDrawer
          todo={editing}
          users={users}
          origin={openTodo?.origin ?? null}
          onClose={() => setOpenTodo(null)}
          onSave={(fields) =>
            mutate({ type: "details", id: editing.id, fields }, () =>
              updateDailyTodoDetailsAction(editing.id, fields)
            )
          }
          onAssign={(assignees) => assign(editing, assignees)}
          onDelete={() => requestDelete(editing)}
        />
      ) : null}

      {trashed ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-lg bg-neutral-900/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-md"
        >
          <span className="min-w-0 truncate">
            &ldquo;{trashed.text}&rdquo; excluída
          </span>
          <button
            type="button"
            onClick={undoDelete}
            className="shrink-0 rounded font-medium text-white underline underline-offset-2 transition-transform focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-[0.97]"
          >
            Desfazer
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Alvos de toque: o visual continua compacto no mouse e cresce pra 44px em
 * ponteiro grosso (dedo), onde não existe hover e a mira é imprecisa.
 */
const HIT_TARGET =
  "flex shrink-0 items-center justify-center rounded transition-transform pointer-coarse:size-11 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-90";

/** Classe da linha que está saindo em direção ao seu novo lugar. */
function rowMotionClass(
  flying: { id: string; done: boolean } | null,
  id: string,
  reduceMotion: boolean | null
) {
  if (reduceMotion || flying?.id !== id) return "transition-none";
  return `transition-all duration-150 ease-out ${
    flying.done ? "translate-y-2 opacity-0" : "-translate-y-2 opacity-0"
  }`;
}

/** Acima disto a fileira de bolinhas vira contagem, não progresso. */
const MAX_PROGRESS_DOTS = 5;

/**
 * Progresso da checklist como forma, não como número: a fileira de bolinhas se
 * lê de relance, sem interpretar a fração. Passando de cinco passos elas
 * ficariam pequenas demais pra distinguir, e aí uma barra com a fração diz mais.
 */
function ChecklistProgress({ done, total }: { done: number; total: number }) {
  const label = `Checklist: ${done} de ${total} ${
    total === 1 ? "passo feito" : "passos feitos"
  }`;

  if (total > MAX_PROGRESS_DOTS) {
    return (
      <span
        className="flex items-center gap-1.5 text-neutral-500"
        title={label}
        aria-label={label}
      >
        <span
          aria-hidden="true"
          className="h-1 w-10 overflow-hidden rounded-full bg-neutral-200"
        >
          <span
            className="block h-full rounded-full bg-emerald-600 transition-[width] duration-200 ease-out"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </span>
        {done}/{total}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1"
      title={label}
      aria-label={label}
      role="img"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`size-2 rounded-full transition-colors ${
            index < done
              ? "bg-emerald-600"
              : "border border-neutral-400 bg-transparent"
          }`}
        />
      ))}
    </span>
  );
}

type RowProps = {
  todo: DailyTodoView;
  users: TodoUser[];
  onOpen: (origin: { x: number; y: number } | null) => void;
  onToggle: () => void;
  onAssign: (assignees: TodoUser[]) => void;
  onDelete: () => void;
};

function DragHandleIcon({ label }: { label: string | null }) {
  return (
    <span
      aria-hidden={label ? undefined : "true"}
      className={`${HIT_TARGET} size-6 text-neutral-400`}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5"
        fill="currentColor"
      >
        <circle cx="6" cy="3" r="1.2" />
        <circle cx="10" cy="3" r="1.2" />
        <circle cx="6" cy="8" r="1.2" />
        <circle cx="10" cy="8" r="1.2" />
        <circle cx="6" cy="13" r="1.2" />
        <circle cx="10" cy="13" r="1.2" />
      </svg>
    </span>
  );
}

/** Só a pendente é arrastável — a ordem manual não vale pro histórico. */
function SortableTodoRow({
  flying,
  reduceMotion,
  ...props
}: RowProps & {
  flying: { id: string; done: boolean } | null;
  reduceMotion: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.todo.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // Enquanto arrasta, quem aparece é a camada de cima; o buraco na lista
      // fica só marcado, sem sumir de vez.
      className={`${isDragging ? "opacity-30" : ""} ${rowMotionClass(
        flying,
        props.todo.id,
        reduceMotion
      )}`}
    >
      <TodoRow
        {...props}
        dragHandle={
          // A alça isola o arraste: o resto da linha continua clicável, e
          // arrastar de qualquer lugar tornaria impossível clicar no texto.
          <span
            {...attributes}
            {...listeners}
            aria-label={`Reordenar ${props.todo.text}`}
            className={`${HIT_TARGET} size-6 cursor-grab touch-none text-neutral-400 hover:text-neutral-700 active:cursor-grabbing`}
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="size-3.5"
              fill="currentColor"
            >
              <circle cx="6" cy="3" r="1.2" />
              <circle cx="10" cy="3" r="1.2" />
              <circle cx="6" cy="8" r="1.2" />
              <circle cx="10" cy="8" r="1.2" />
              <circle cx="6" cy="13" r="1.2" />
              <circle cx="10" cy="13" r="1.2" />
            </svg>
          </span>
        }
      />
    </li>
  );
}

function TodoRow({
  todo,
  users,
  onOpen,
  onToggle,
  onAssign,
  onDelete,
  dragHandle,
}: RowProps & { dragHandle?: React.ReactNode }) {
  const [showChecklist, setShowChecklist] = useState(false);
  // Marcar um passo aqui grava direto, sem abrir o painel. O override local
  // pinta a bolinha na hora; a revalidação depois confirma o mesmo valor.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const checklist = todo.checklist.map((item) => ({
    ...item,
    done: overrides[item.id] ?? item.done,
  }));
  const checklistDone = checklist.filter((item) => item.done).length;

  function toggleChecklistItem(id: string, done: boolean) {
    setOverrides((current) => ({ ...current, [id]: done }));
    startTransition(() => setDailyTodoChecklistItemDoneAction(id, done));
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <div className="group flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
        {dragHandle}

        {/* Marcar fica só no checkbox: se o resto da linha também alternasse, o
            clique que abre o painel viraria toggle. */}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={todo.done}
          aria-label={todo.done ? "Marcar como pendente" : "Marcar como feita"}
          className={`${HIT_TARGET} size-6 hover:bg-neutral-100`}
        >
          <span
            className={`flex size-4 items-center justify-center rounded border text-[10px] transition-colors ${
              todo.done
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-neutral-400"
            }`}
          >
            {todo.done ? "✓" : ""}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          {/* O título abre o painel, como o card do kanban. O ponto do clique
              vai junto: o painel cresce de onde a pessoa tocou. */}
          <button
            type="button"
            onClick={(event) => onOpen({ x: event.clientX, y: event.clientY })}
            className="block w-full cursor-pointer rounded text-left focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {/* Concluída fica verde em vez de riscada: continua legível. */}
            <span
              className={`block text-[15px] leading-snug break-words ${
                todo.done ? "text-emerald-700" : "text-neutral-800"
              }`}
            >
              {todo.text}
            </span>
          </button>

          {/* A faixa de dados fica fora do botão do título: o progresso da
              checklist é clicável por conta própria. */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs leading-normal">
            {/* A palavra e a cor já dizem a escala; o número repetia a mesma
                informação em duas grafias. Ele continua no painel, onde se
                escolhe. */}
            <span
              className={`rounded border px-1.5 py-px ${
                TODO_PRIORITY_CLASSES[todo.priority]
              }`}
            >
              {TODO_PRIORITY_LABELS[todo.priority]}
            </span>

            {todo.due_date ? (
              <span
                className={
                  !todo.done && isOverdue(todo.due_date)
                    ? "text-red-600"
                    : "text-neutral-500"
                }
              >
                Prazo {dueLabel(todo.due_date)}
              </span>
            ) : null}

            {checklist.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowChecklist((value) => !value)}
                aria-expanded={showChecklist}
                className="flex items-center gap-1.5 rounded px-0.5 transition-transform hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
              >
                <ChecklistProgress
                  done={checklistDone}
                  total={checklist.length}
                />
                <span
                  aria-hidden="true"
                  className={`text-neutral-500 transition-transform duration-200 ${
                    showChecklist ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>
            ) : null}

            {todo.notes ? (
              <span className="text-neutral-500" title="Tem observações">
                ≡
              </span>
            ) : null}

            {todo.done && todo.completed_at ? (
              <span className="text-neutral-500">
                Sai da lista em {expiryLabel(todo.completed_at)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:contents">
          <TodoAssigneeMenu
            assignees={todo.assignees}
            users={users}
            onAssign={onAssign}
          />

          <button
            type="button"
            onClick={onDelete}
            aria-label={`Excluir ${todo.text}`}
            className={`${HIT_TARGET} size-6 text-neutral-500 hover:bg-neutral-100 hover:text-red-600`}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Os passos abrem dentro da própria linha: ver e marcar a checklist é o
          uso frequente, e abrir o painel inteiro pra isso era caro demais.
          Acrescentar e apagar passos continua no painel. */}
      {showChecklist && checklist.length > 0 ? (
        <ul className="border-t border-neutral-100 px-2 py-1.5 sm:px-3">
          {checklist.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50 pointer-coarse:min-h-11">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(event) =>
                    toggleChecklistItem(item.id, event.target.checked)
                  }
                  className="size-4 shrink-0 accent-emerald-600"
                />
                <span
                  className={
                    item.done ? "text-emerald-700" : "text-neutral-700"
                  }
                >
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
