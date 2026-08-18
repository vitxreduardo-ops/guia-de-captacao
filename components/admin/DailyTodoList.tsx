"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  createDailyTodoAction,
  deleteDailyTodoAction,
  renameDailyTodoAction,
  setDailyTodoAssigneeAction,
  setDailyTodoDoneAction,
} from "@/app/admin/actions";
import { TodoAssigneeMenu } from "@/components/admin/TodoAssigneeMenu";
import { TodoText } from "@/components/admin/TodoText";
import {
  TODO_RETENTION_DAYS,
  type DailyTodoView,
  type TodoUser,
} from "@/lib/dailyTodoTypes";

/** Dia em que a tarefa concluída sai da lista sozinha. */
function expiryLabel(completedAt: string) {
  const expiry = new Date(completedAt);
  expiry.setDate(expiry.getDate() + TODO_RETENTION_DAYS);
  return expiry.toLocaleDateString("pt-BR");
}

type OptimisticAction =
  | { type: "create"; text: string; user: TodoUser | null }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "rename"; id: string; text: string }
  | { type: "assign"; id: string; assignee: TodoUser | null }
  | { type: "delete"; id: string };

/**
 * Mesma ordenação do servidor (pendente primeiro, mais antiga em cima) pra
 * linha não pular de lugar quando o dado real chega.
 */
function sorted(todos: DailyTodoView[]) {
  return [...todos].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) || a.created_at.localeCompare(b.created_at)
  );
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
          done: false,
          completed_at: null,
          created_by: action.user?.id ?? null,
          completed_by: null,
          assignee_id: action.user?.id ?? null,
          created_at: new Date().toISOString(),
          created_by_username: action.user?.username ?? null,
          assignee_username: action.user?.username ?? null,
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
    case "rename":
      return todos.map((todo) =>
        todo.id === action.id ? { ...todo, text: action.text } : todo
      );
    case "assign":
      return todos.map((todo) =>
        todo.id === action.id
          ? {
              ...todo,
              assignee_id: action.assignee?.id ?? null,
              assignee_username: action.assignee?.username ?? null,
            }
          : todo
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
  const inputRef = useRef<HTMLInputElement>(null);

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

  const remaining = optimisticTodos.filter((todo) => !todo.done).length;

  return (
    <div className="space-y-3">
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
      ) : (
        <>
          <ul className="space-y-1">
            {optimisticTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                users={users}
                onToggle={() =>
                  mutate({ type: "toggle", id: todo.id, done: !todo.done }, () =>
                    setDailyTodoDoneAction(todo.id, !todo.done)
                  )
                }
                onRename={(text) =>
                  mutate({ type: "rename", id: todo.id, text }, () =>
                    renameDailyTodoAction(todo.id, text)
                  )
                }
                onAssign={(assignee) =>
                  mutate({ type: "assign", id: todo.id, assignee }, () =>
                    setDailyTodoAssigneeAction(todo.id, assignee?.id ?? null)
                  )
                }
                onDelete={() =>
                  mutate({ type: "delete", id: todo.id }, () =>
                    deleteDailyTodoAction(todo.id)
                  )
                }
              />
            ))}
          </ul>
          <p className="text-xs text-neutral-500">
            {remaining === 0
              ? "Tudo feito."
              : `${remaining} de ${optimisticTodos.length} pendente${
                  remaining > 1 ? "s" : ""
                }`}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Alvos de toque: o visual continua compacto no mouse e cresce pra 44px em
 * ponteiro grosso (dedo), onde não existe hover e a mira é imprecisa.
 */
const HIT_TARGET =
  "flex shrink-0 items-center justify-center rounded transition-transform pointer-coarse:size-11 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-90";

function TodoRow({
  todo,
  users,
  onToggle,
  onRename,
  onAssign,
  onDelete,
}: {
  todo: DailyTodoView;
  users: TodoUser[];
  onToggle: () => void;
  onRename: (text: string) => void;
  onAssign: (assignee: TodoUser | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="group flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-sm sm:gap-2 sm:px-3 sm:py-2">
      {/* Marcar fica só no checkbox: se o texto também alternasse, o duplo
          clique pra renomear dispararia o toggle duas vezes. */}
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
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-300"
          }`}
        >
          {todo.done ? "✓" : ""}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <TodoText
          text={todo.text}
          done={todo.done}
          editing={editing}
          onEditingChange={setEditing}
          onRename={onRename}
        />
        {todo.done && todo.completed_at ? (
          <span className="mt-0.5 block text-xs text-neutral-400">
            Sai da lista em {expiryLabel(todo.completed_at)}
          </span>
        ) : null}
      </div>

      {/* No mouse o lápis só aparece no hover/foco da linha, pra não poluir.
          Em toque fica sempre visível: lá não existe hover nem duplo clique,
          então sem ele o renomear seria impossível de descobrir. */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Renomear ${todo.text}`}
        className={`${HIT_TARGET} size-6 text-neutral-400 opacity-0 hover:bg-neutral-100 hover:text-neutral-700 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100`}
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11.5 2.5a1.7 1.7 0 0 1 2.4 2.4L5.6 13.2 2.5 14l.8-3.1z" />
        </svg>
      </button>

      <TodoAssigneeMenu
        assigneeId={todo.assignee_id}
        assigneeUsername={todo.assignee_username}
        users={users}
        onAssign={onAssign}
      />

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Excluir esta tarefa?")) onDelete();
        }}
        aria-label={`Excluir ${todo.text}`}
        className={`${HIT_TARGET} size-6 text-neutral-400 hover:bg-neutral-100 hover:text-red-600`}
      >
        ✕
      </button>
    </li>
  );
}
