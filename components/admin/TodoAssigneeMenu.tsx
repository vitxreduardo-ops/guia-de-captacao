"use client";

import { useState } from "react";
import { setDailyTodoAssigneeAction } from "@/app/admin/actions";
import { UserInitials } from "@/components/admin/UserInitials";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TodoUser } from "@/lib/dailyTodos";

/**
 * Bolinha do responsável que abre a lista de usuários. Sem responsável vira um
 * círculo tracejado vazio, pra continuar existindo um alvo de clique.
 */
export function TodoAssigneeMenu({
  todoId,
  assigneeId,
  assigneeUsername,
  users,
}: {
  todoId: string;
  assigneeId: string | null;
  assigneeUsername: string | null;
  users: TodoUser[];
}) {
  const [open, setOpen] = useState(false);

  const options: { id: string; label: string; username: string | null }[] = [
    ...users.map((user) => ({
      id: user.id,
      label: user.username,
      username: user.username,
    })),
    { id: "none", label: "Sem responsável", username: null },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="shrink-0 cursor-pointer rounded-full"
        aria-label={
          assigneeUsername
            ? `Responsável: ${assigneeUsername}. Clique para trocar.`
            : "Sem responsável. Clique para escolher."
        }
        title={
          assigneeUsername
            ? `Responsável: ${assigneeUsername}`
            : "Sem responsável"
        }
      >
        {assigneeUsername ? (
          <UserInitials username={assigneeUsername} label={undefined} />
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
        {options.map((option) => {
          const selected = (assigneeId ?? "none") === option.id;
          return (
            <form
              key={option.id}
              action={setDailyTodoAssigneeAction}
              onSubmit={() => setOpen(false)}
            >
              <input type="hidden" name="id" value={todoId} />
              <input type="hidden" name="assignee_id" value={option.id} />
              <button
                type="submit"
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 ${
                  selected ? "font-medium text-neutral-900" : "text-neutral-700"
                }`}
              >
                {option.username ? (
                  <UserInitials username={option.username} />
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-300 text-[10px] text-neutral-400">
                    –
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected ? (
                  <span className="shrink-0 text-neutral-900">✓</span>
                ) : null}
              </button>
            </form>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
