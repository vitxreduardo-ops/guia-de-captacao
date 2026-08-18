"use client";

import { useState } from "react";
import { UserInitials } from "@/components/admin/UserInitials";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TodoUser } from "@/lib/dailyTodoTypes";

/**
 * Bolinha do responsável que abre a lista de usuários. Sem responsável vira um
 * círculo tracejado, pra continuar existindo um alvo de clique. Quem grava é a
 * lista, dona do estado otimista.
 */
export function TodoAssigneeMenu({
  assigneeId,
  assigneeUsername,
  users,
  onAssign,
}: {
  assigneeId: string | null;
  assigneeUsername: string | null;
  users: TodoUser[];
  onAssign: (assignee: TodoUser | null) => void;
}) {
  const [open, setOpen] = useState(false);

  function pick(assignee: TodoUser | null) {
    setOpen(false);
    onAssign(assignee);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={
          assigneeUsername
            ? `Responsável: ${assigneeUsername}. Clique para trocar.`
            : "Sem responsável. Clique para escolher."
        }
        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-90 pointer-coarse:size-11"
      >
        {assigneeUsername ? (
          <UserInitials username={assigneeUsername} decorative />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-neutral-300 text-[10px] text-neutral-400">
            +
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 gap-1 p-1.5">
        <p className="px-2 pt-1 pb-0.5 text-xs font-semibold text-neutral-500">
          Responsável
        </p>
        {users.map((user) => (
          <AssigneeOption
            key={user.id}
            label={user.username}
            username={user.username}
            selected={assigneeId === user.id}
            onSelect={() => pick(user)}
          />
        ))}
        <AssigneeOption
          label="Sem responsável"
          username={null}
          selected={assigneeId === null}
          onSelect={() => pick(null)}
        />
      </PopoverContent>
    </Popover>
  );
}

function AssigneeOption({
  label,
  username,
  selected,
  onSelect,
}: {
  label: string;
  username: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-transform hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] ${
        selected ? "font-medium text-neutral-900" : "text-neutral-700"
      }`}
    >
      {username ? (
        <UserInitials username={username} decorative />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-300 text-[10px] text-neutral-400">
          –
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected ? <span className="shrink-0 text-neutral-900">✓</span> : null}
    </button>
  );
}
