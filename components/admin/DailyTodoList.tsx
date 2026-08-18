import {
  createDailyTodoAction,
  deleteDailyTodoAction,
  setDailyTodoDoneAction,
} from "@/app/admin/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TodoAssigneeMenu } from "@/components/admin/TodoAssigneeMenu";
import { TodoText } from "@/components/admin/TodoText";
import {
  TODO_RETENTION_DAYS,
  type DailyTodoView,
  type TodoUser,
} from "@/lib/dailyTodos";

/** Dia em que a tarefa concluída sai da lista sozinha. */
function expiryLabel(completedAt: string) {
  const expiry = new Date(completedAt);
  expiry.setDate(expiry.getDate() + TODO_RETENTION_DAYS);
  return expiry.toLocaleDateString("pt-BR");
}

function TodoRow({ todo, users }: { todo: DailyTodoView; users: TodoUser[] }) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm">
      {/* Marcar fica só no checkbox: se o texto também alternasse, o duplo
          clique pra renomear dispararia o toggle duas vezes. Por isso a área
          de clique é maior que o quadradinho. */}
      <form action={setDailyTodoDoneAction} className="flex">
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="done" value={(!todo.done).toString()} />
        <button
          type="submit"
          aria-label={todo.done ? "Marcar como pendente" : "Marcar como feita"}
          className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-neutral-100"
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
      </form>

      <div className="min-w-0 flex-1">
        <TodoText id={todo.id} text={todo.text} done={todo.done} />
        {todo.done && todo.completed_at ? (
          <span className="mt-0.5 block text-xs text-neutral-400">
            Sai da lista em {expiryLabel(todo.completed_at)}
          </span>
        ) : null}
      </div>

      <TodoAssigneeMenu
        todoId={todo.id}
        assigneeId={todo.assignee_id}
        assigneeUsername={todo.assignee_username}
        users={users}
      />

      <form action={deleteDailyTodoAction} className="flex">
        <input type="hidden" name="id" value={todo.id} />
        <DeleteButton
          label="✕"
          ariaLabel="Excluir tarefa"
          className="flex size-5 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
          confirmMessage="Excluir esta tarefa?"
        />
      </form>
    </li>
  );
}

export function DailyTodoList({
  todos,
  users,
}: {
  todos: DailyTodoView[];
  users: TodoUser[];
}) {
  const remaining = todos.filter((todo) => !todo.done).length;

  return (
    <div className="space-y-3">
      <form action={createDailyTodoAction} className="flex gap-2">
        <input
          name="text"
          placeholder="Nova tarefa"
          required
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Adicionar
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          Nenhuma tarefa por aqui.
        </p>
      ) : (
        <>
          <ul className="space-y-1">
            {todos.map((todo) => (
              <TodoRow key={todo.id} todo={todo} users={users} />
            ))}
          </ul>
          <p className="text-xs text-neutral-500">
            {remaining === 0
              ? "Tudo feito."
              : `${remaining} de ${todos.length} pendente${
                  remaining > 1 ? "s" : ""
                }`}
          </p>
        </>
      )}
    </div>
  );
}
