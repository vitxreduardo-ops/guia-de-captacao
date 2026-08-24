"use client";

import { useRef, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TodoAssigneeMenu } from "@/components/admin/TodoAssigneeMenu";
import {
  createDailyTodoChecklistItemAction,
  deleteDailyTodoChecklistItemAction,
  setDailyTodoChecklistItemDoneAction,
} from "@/app/admin/actions";
import {
  TODO_PRIORITIES,
  TODO_PRIORITY_LABELS,
  toTodoPriority,
  type DailyTodoChecklistItem,
  type DailyTodoView,
  type TodoPriority,
  type TodoUser,
} from "@/lib/dailyTodoTypes";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

/**
 * Checklist da tarefa. Cada item grava na hora, sem passar pelo Salvar do
 * painel — e fica fora do `form` porque `form` dentro de `form` é HTML
 * inválido.
 */
function ChecklistSection({
  todoId,
  items,
}: {
  todoId: string;
  items: DailyTodoChecklistItem[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  const done = items.filter((item) => item.done).length;

  function addItem() {
    const label = draft.trim();
    if (!label) return;
    startTransition(async () => {
      await createDailyTodoChecklistItemAction(todoId, label);
      setDraft("");
      inputRef.current?.focus();
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className={labelClass + " mb-0"}>Checklist</p>
        {items.length > 0 ? (
          <span className="text-xs text-neutral-500">
            {done}/{items.length}
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="mb-2 flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1.5"
            >
              <input
                type="checkbox"
                checked={item.done}
                disabled={pending}
                onChange={(event) => {
                  const next = event.target.checked;
                  startTransition(() =>
                    setDailyTodoChecklistItemDoneAction(item.id, next)
                  );
                }}
                className="h-4 w-4 shrink-0 accent-emerald-600"
              />
              {/* Feito fica verde, não riscado: mesma regra da lista de fora. */}
              <span
                className={`flex-1 text-sm ${
                  item.done ? "text-emerald-700" : "text-neutral-800"
                }`}
              >
                {item.label}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    deleteDailyTodoChecklistItemAction(item.id)
                  )
                }
                aria-label={`Excluir "${item.label}"`}
                className="shrink-0 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-neutral-500">
          Nenhum passo ainda. Ex: levantar material, escrever, revisar.
        </p>
      )}

      <div className="flex gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // O painel inteiro é um form: sem isso, Enter salvaria a tarefa.
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Novo passo"
          aria-label="Novo passo da checklist"
          disabled={pending}
          className={inputClass}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={pending}
          aria-label="Adicionar passo"
          className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Painel de detalhes da tarefa, no mesmo formato do card do kanban: campos à
 * esquerda, checklist à direita. Os campos de texto só vão pro banco no
 * Salvar; responsável e checklist gravam na hora, como já era na lista.
 */
export function TodoDrawer({
  todo,
  users,
  onClose,
  onSave,
  onAssign,
  onDelete,
}: {
  todo: DailyTodoView;
  users: TodoUser[];
  onClose: () => void;
  onSave: (fields: {
    text: string;
    notes: string;
    dueDate: string | null;
    priority: TodoPriority;
  }) => void;
  onAssign: (assignees: TodoUser[]) => void;
  onDelete: () => void;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = String(formData.get("text") ?? "").trim();
    // Título vazio apagaria a tarefa da vista sem apagar do banco.
    if (!text) return;

    onSave({
      text,
      notes: String(formData.get("notes") ?? ""),
      dueDate: String(formData.get("due_date") ?? "") || null,
      priority: toTodoPriority(formData.get("priority")),
    });
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="grid max-h-[calc(100dvh-6rem)] w-[calc(100%-3rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-5 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Editar tarefa</DialogTitle>
        </DialogHeader>

        <form
          id="daily-todo-form"
          onSubmit={handleSubmit}
          className="grid min-h-0 content-start gap-5 overflow-y-auto sm:grid-cols-[1fr_18rem] sm:content-stretch sm:overflow-hidden"
        >
          <div className="flex flex-col gap-4 sm:min-h-0 sm:overflow-y-auto sm:pr-2">
            <div>
              <label className={labelClass} htmlFor="todo-text">
                Tarefa
              </label>
              <input
                id="todo-text"
                name="text"
                defaultValue={todo.text}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="todo-priority">
                  Prioridade
                </label>
                <select
                  id="todo-priority"
                  name="priority"
                  defaultValue={String(todo.priority)}
                  className={inputClass}
                >
                  {TODO_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority} · {TODO_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="todo-due-date">
                  Prazo
                </label>
                <input
                  id="todo-due-date"
                  type="date"
                  name="due_date"
                  defaultValue={todo.due_date ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Responsáveis</p>
              {/* Grava na hora, igual à bolinha da linha: é a mesma ação. */}
              <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5">
                <TodoAssigneeMenu
                  assignees={todo.assignees}
                  users={users}
                  onAssign={onAssign}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">
                  {todo.assignees.length === 0
                    ? "Sem responsável"
                    : todo.assignees.map((user) => user.username).join(", ")}
                </span>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="todo-notes">
                Observações
              </label>
              <textarea
                id="todo-notes"
                name="notes"
                defaultValue={todo.notes}
                rows={5}
                className={inputClass}
              />
            </div>

            <p className="text-xs text-neutral-400">
              Criada por {todo.created_by_username ?? "alguém"} em{" "}
              {new Date(todo.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-neutral-200 sm:min-h-0 sm:overflow-y-auto sm:border-l sm:pl-5">
            <ChecklistSection todoId={todo.id} items={todo.checklist} />
          </div>
        </form>

        <DialogFooter className="flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Excluir esta tarefa?")) return;
              onDelete();
              onClose();
            }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Excluir
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Fechar
            </button>
            <button
              type="submit"
              form="daily-todo-form"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Salvar
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
