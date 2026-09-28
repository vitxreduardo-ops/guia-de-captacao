"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notifyDailyTodoAssigneesAction } from "@/app/admin/actions";
import { UserInitials } from "@/components/admin/UserInitials";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TodoUser } from "@/lib/dailyTodoTypes";

/**
 * Bolinhas dos responsáveis, que abrem a lista de usuários. Sem ninguém, vira
 * um círculo tracejado pra continuar existindo alvo de clique. Quem grava é a
 * lista, dona do estado otimista.
 */
export function TodoAssigneeMenu({
  todoId,
  assignees,
  users,
  onAssign,
}: {
  todoId: string;
  assignees: TodoUser[];
  users: TodoUser[];
  onAssign: (assignees: TodoUser[]) => void;
}) {
  const [open, setOpenState] = useState(false);
  const selectedIds = new Set(assignees.map((user) => user.id));

  // Quem já era responsável quando a lista abriu. Cada toque grava na hora,
  // mas o aviso só sai ao fechar, pra quem entrou de fato: marcar e desmarcar
  // alguém no meio da escolha não manda notificação.
  // `null` = fechada.
  const openedWith = useRef<string[] | null>(null);
  const latest = useRef({ todoId, assignees });
  useEffect(() => {
    latest.current = { todoId, assignees };
  });

  const notifyAdded = useCallback(() => {
    const before = openedWith.current;
    openedWith.current = null;
    if (!before) return;
    const added = latest.current.assignees
      .map((user) => user.id)
      .filter((id) => !before.includes(id));
    if (added.length > 0) {
      notifyDailyTodoAssigneesAction(latest.current.todoId, added);
    }
  }, []);

  // A lista pode sumir ainda aberta (a gaveta da tarefa fechou por cima): o
  // aviso sai do mesmo jeito.
  useEffect(() => notifyAdded, [notifyAdded]);

  function setOpen(next: boolean) {
    if (next && !open) openedWith.current = assignees.map((user) => user.id);
    if (!next && open) notifyAdded();
    setOpenState(next);
  }

  /** Marca/desmarca sem fechar: escolher vários é o caso normal aqui. */
  function toggle(user: TodoUser) {
    onAssign(
      selectedIds.has(user.id)
        ? assignees.filter((current) => current.id !== user.id)
        : // Segue a ordem de `users` pra bolinha não pular de lugar.
          users.filter(
            (candidate) =>
              selectedIds.has(candidate.id) || candidate.id === user.id
          )
    );
  }

  const label =
    assignees.length === 0
      ? "Sem responsável. Clique para escolher."
      : `Responsáveis: ${assignees
          .map((user) => user.username)
          .join(", ")}. Clique para trocar.`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        className="flex h-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-90 pointer-coarse:min-h-11"
      >
        {assignees.length === 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-neutral-400 text-[10px] text-neutral-500">
            +
          </span>
        ) : (
          // -space-x sobrepõe; o anel branco recorta uma da outra.
          <span className="flex -space-x-1.5">
            {assignees.map((user) => (
              <UserInitials
                key={user.id}
                username={user.username}
                decorative
                className="ring-2 ring-white"
              />
            ))}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 gap-1 p-1.5">
        <p className="px-2 pt-1 pb-0.5 text-xs font-semibold text-neutral-500">
          Responsáveis
        </p>
        {users.map((user) => (
          <AssigneeOption
            key={user.id}
            username={user.username}
            selected={selectedIds.has(user.id)}
            onSelect={() => toggle(user)}
          />
        ))}
        {assignees.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              onAssign([]);
              setOpen(false);
            }}
            className="mt-0.5 w-full rounded-md border-t border-neutral-100 px-2 pt-2 pb-1 text-left text-sm text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Limpar
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function AssigneeOption({
  username,
  selected,
  onSelect,
}: {
  username: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-transform hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] ${
        selected ? "font-medium text-neutral-900" : "text-neutral-700"
      }`}
    >
      <UserInitials username={username} decorative />
      <span className="min-w-0 flex-1 truncate">{username}</span>
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center rounded border text-[10px] ${
          selected
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-300"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
    </button>
  );
}
