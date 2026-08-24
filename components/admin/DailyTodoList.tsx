"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createDailyTodoAction,
  deleteDailyTodoAction,
  reorderDailyTodosAction,
  setDailyTodoAssigneesAction,
  setDailyTodoDoneAction,
  updateDailyTodoDetailsAction,
} from "@/app/admin/actions";
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
          position:
            Math.max(-1, ...todos.map((todo) => todo.position)) + 1,
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
        todo.id === action.id
          ? { ...todo, assignees: action.assignees }
          : todo
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
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    // Sem a distância mínima, o clique que abre o painel viraria arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // A alça é focável: sem este sensor ela receberia foco e não faria nada no
    // teclado. Espaço pega a tarefa, setas movem, Espaço solta.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /** Toda mutação pinta a tela primeiro e só depois espera o servidor. */
  function mutate(optimistic: OptimisticAction, run: () => Promise<void>) {
    startTransition(async () => {
      apply(optimistic);
      await run();
    });
  }

  function create() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    inputRef.current?.focus();
    mutate({ type: "create", text, user: currentUser }, () =>
      createDailyTodoAction(text)
    );
  }

  function toggle(todo: DailyTodoView) {
    mutate({ type: "toggle", id: todo.id, done: !todo.done }, () =>
      setDailyTodoDoneAction(todo.id, !todo.done)
    );
  }

  function assign(todo: DailyTodoView, assignees: TodoUser[]) {
    mutate({ type: "assign", id: todo.id, assignees }, () =>
      setDailyTodoAssigneesAction(
        todo.id,
        assignees.map((user) => user.id)
      )
    );
  }

  function remove(todo: DailyTodoView) {
    mutate({ type: "delete", id: todo.id }, () =>
      deleteDailyTodoAction(todo.id)
    );
  }

  // Ordena sempre no render, não só nas mutações otimistas: o servidor devolve
  // tudo por position, e as concluídas precisam da última fechada no topo.
  const ordered = sorted(optimisticTodos);
  const pending = ordered.filter((todo) => !todo.done);
  const done = ordered.filter((todo) => todo.done);
  const openTodo = openTodoId
    ? optimisticTodos.find((todo) => todo.id === openTodoId) ?? null
    : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = pending.map((todo) => todo.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    const orderedIds = arrayMove(ids, from, to);
    mutate({ type: "reorder", orderedIds }, () =>
      reorderDailyTodosAction(orderedIds)
    );
  }

  return (
    <div className="space-y-3">
      {/* O contador vive no título, não no rodapé: é a informação mais útil do
          bloco e estava renderizada como a menos importante. Fica aqui dentro
          pra acompanhar o estado otimista. */}
      <h2 id="tarefas-titulo" className="text-sm font-semibold text-neutral-900">
        Tarefas
        {optimisticTodos.length > 0 ? (
          <span className="font-normal text-neutral-500">
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
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus-visible:border-neutral-500 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-transform hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
        >
          Adicionar
        </button>
      </form>

      {optimisticTodos.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          Nenhuma tarefa por aqui.
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
          onDragEnd={handleDragEnd}
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
                  onOpen={() => setOpenTodoId(todo.id)}
                  onToggle={() => toggle(todo)}
                  onAssign={(assignees) => assign(todo, assignees)}
                  onDelete={() => {
                    if (window.confirm("Excluir esta tarefa?")) remove(todo);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      {done.length > 0 ? (
        // Concluída não precisa estar à vista o tempo todo, mas some sozinha só
        // depois da retenção — o dropdown guarda sem apagar.
        <details className="rounded-md border border-neutral-200">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm text-neutral-600 marker:content-none hover:bg-neutral-50">
            <span className="mr-1 inline-block text-xs text-neutral-400">▸</span>
            Concluídas ({done.length})
          </summary>
          <ul className="space-y-1 border-t border-neutral-200 p-2">
            {done.map((todo) => (
              <li key={todo.id}>
                <TodoRow
                  todo={todo}
                  users={users}
                  onOpen={() => setOpenTodoId(todo.id)}
                  onToggle={() => toggle(todo)}
                  onAssign={(assignees) => assign(todo, assignees)}
                  onDelete={() => {
                    if (window.confirm("Excluir esta tarefa?")) remove(todo);
                  }}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {openTodo ? (
        <TodoDrawer
          todo={openTodo}
          users={users}
          onClose={() => setOpenTodoId(null)}
          onSave={(fields) =>
            mutate({ type: "details", id: openTodo.id, fields }, () =>
              updateDailyTodoDetailsAction(openTodo.id, fields)
            )
          }
          onAssign={(assignees) => assign(openTodo, assignees)}
          onDelete={() => remove(openTodo)}
        />
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

type RowProps = {
  todo: DailyTodoView;
  users: TodoUser[];
  onOpen: () => void;
  onToggle: () => void;
  onAssign: (assignees: TodoUser[]) => void;
  onDelete: () => void;
};

/** Só a pendente é arrastável — a ordem manual não vale pro histórico. */
function SortableTodoRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.todo.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
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
            className={`${HIT_TARGET} size-6 cursor-grab touch-none text-neutral-300 hover:text-neutral-600 active:cursor-grabbing`}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="currentColor">
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
  const checklistDone = todo.checklist.filter((item) => item.done).length;

  return (
    <div className="group flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-sm sm:gap-2 sm:px-3 sm:py-2">
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
          className={`flex size-4 items-center justify-center rounded border text-[10px] ${
            todo.done
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-neutral-300"
          }`}
        >
          {todo.done ? "✓" : ""}
        </span>
      </button>

      {/* A linha inteira abre o painel, como o card do kanban. */}
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {/* Concluída fica verde em vez de riscada: continua legível. */}
        <span
          className={`block break-words ${
            todo.done ? "text-emerald-700" : "text-neutral-800"
          }`}
        >
          {todo.text}
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          {/* Média é o padrão de toda tarefa nova: mostrar a etiqueta em todas
              as linhas encheria a lista de um dado que não distingue nada. */}
          {todo.priority !== 2 ? (
            <span
              className={`rounded border px-1.5 py-px ${
                TODO_PRIORITY_CLASSES[todo.priority]
              }`}
            >
              P{todo.priority} · {TODO_PRIORITY_LABELS[todo.priority]}
            </span>
          ) : null}

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

          {todo.checklist.length > 0 ? (
            <span className="text-neutral-500">
              ☑ {checklistDone}/{todo.checklist.length}
            </span>
          ) : null}

          {todo.notes ? (
            <span className="text-neutral-400" title="Tem observações">
              ≡
            </span>
          ) : null}

          {todo.done && todo.completed_at ? (
            <span className="text-neutral-400">
              Sai da lista em {expiryLabel(todo.completed_at)}
            </span>
          ) : null}
        </span>
      </button>

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
          className={`${HIT_TARGET} size-6 text-neutral-400 hover:bg-neutral-100 hover:text-red-600`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
