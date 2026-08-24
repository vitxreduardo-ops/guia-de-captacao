"use client";

import { useCallback, useRef, useState, useTransition } from "react";
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
                className="shrink-0 text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
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
 * esquerda, checklist à direita.
 *
 * Tudo grava sozinho — o texto ao sair do campo, prioridade e prazo na hora da
 * escolha. Antes metade dos campos esperava um botão Salvar enquanto a outra
 * metade já gravava, e fechar no X descartava o que estava digitado sem avisar.
 */
export function TodoDrawer({
  todo,
  users,
  origin,
  onClose,
  onSave,
  onAssign,
  onDelete,
}: {
  todo: DailyTodoView;
  users: TodoUser[];
  /** Ponto da tela onde a pessoa clicou, pro painel crescer de lá. */
  origin: { x: number; y: number } | null;
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
  const [fields, setFields] = useState({
    text: todo.text,
    notes: todo.notes,
    dueDate: todo.due_date ?? "",
    priority: todo.priority,
  });
  // O painel cresce do ponto tocado, não do centro da tela: a relação entre a
  // linha clicada e o painel que abriu fica visível. É um ref de callback
  // porque a origem precisa estar no elemento antes do primeiro quadro da
  // animação de entrada — um efeito chegaria com ela já em curso.
  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !origin) return;
      const apply = () => {
        const rect = node.getBoundingClientRect();
        node.style.transformOrigin = `${origin.x - rect.left}px ${
          origin.y - rect.top
        }px`;
      };
      apply();
      // O Base UI escreve o próprio `style` ao posicionar o popup; reaplicar no
      // quadro seguinte garante que a origem sobreviva a isso.
      requestAnimationFrame(apply);
    },
    [origin]
  );

  /** Grava o que já está em `fields`, com a alteração recém-feita por cima. */
  function commit(patch: Partial<typeof fields>) {
    const next = { ...fields, ...patch };
    setFields(next);

    const text = next.text.trim();
    // Título vazio apagaria a tarefa da vista sem apagar do banco: o campo
    // continua editável, mas não é isso que vai pro servidor.
    if (!text) return;
    if (
      text === todo.text &&
      next.notes === todo.notes &&
      (next.dueDate || null) === todo.due_date &&
      next.priority === todo.priority
    ) {
      return;
    }

    onSave({
      text,
      notes: next.notes,
      dueDate: next.dueDate || null,
      priority: next.priority,
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        ref={setContentRef}
        className="grid max-h-[calc(100dvh-6rem)] w-[calc(100%-3rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-5 sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">
            Editar tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 content-start gap-5 overflow-y-auto sm:grid-cols-[1fr_18rem] sm:content-stretch sm:overflow-hidden">
          <div className="flex flex-col gap-4 sm:min-h-0 sm:overflow-y-auto sm:pr-2">
            <div>
              <label className={labelClass} htmlFor="todo-text">
                Tarefa
              </label>
              <input
                id="todo-text"
                value={fields.text}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
                onBlur={(event) => commit({ text: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
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
                  value={String(fields.priority)}
                  onChange={(event) =>
                    commit({ priority: toTodoPriority(event.target.value) })
                  }
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
                  value={fields.dueDate}
                  onChange={(event) => commit({ dueDate: event.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Responsáveis</p>
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
                value={fields.notes}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                onBlur={(event) => commit({ notes: event.target.value })}
                rows={5}
                className={`${inputClass} leading-relaxed`}
              />
            </div>

            <p className="text-xs text-neutral-500">
              Criada por {todo.created_by_username ?? "alguém"} em{" "}
              {new Date(todo.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-neutral-200 sm:min-h-0 sm:overflow-y-auto sm:border-l sm:pl-5">
            <ChecklistSection todoId={todo.id} items={todo.checklist} />
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm text-red-500 transition-transform hover:text-red-700 active:scale-[0.97]"
          >
            Excluir
          </button>
          {/* Sem botão Salvar: cada campo já gravou. O rodapé só encerra. */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-neutral-800 active:scale-[0.97]"
          >
            Fechar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
