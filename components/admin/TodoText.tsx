"use client";

import { useRef, useState, useTransition } from "react";
import { renameDailyTodoAction } from "@/app/admin/actions";

/**
 * Texto da tarefa com renomear por duplo clique. Sai da edição salvando no
 * Enter ou ao perder o foco, e descartando no Escape.
 */
export function TodoText({
  id,
  text,
  done,
}: {
  id: string;
  text: string;
  done: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [pending, startTransition] = useTransition();
  // Fechar a edição tira o foco do input e dispara o onBlur. Sem esta trava o
  // Escape cancelaria e o blur logo em seguida salvaria assim mesmo.
  const skipBlur = useRef(false);

  function open() {
    // Relê o texto atual: outra pessoa pode ter renomeado desde o último draft.
    setDraft(text);
    setEditing(true);
  }

  function save() {
    skipBlur.current = true;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === text) {
      setDraft(text);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await renameDailyTodoAction(id, trimmed);
      setEditing(false);
    });
  }

  function cancel() {
    skipBlur.current = true;
    setDraft(text);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        value={draft}
        autoFocus
        disabled={pending}
        aria-label="Renomear tarefa"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        onBlur={() => {
          if (skipBlur.current) {
            skipBlur.current = false;
            return;
          }
          save();
        }}
        className="w-full rounded border border-neutral-400 px-1.5 py-0.5 text-sm text-neutral-800 focus:outline-none disabled:opacity-50"
      />
    );
  }

  return (
    <span
      onDoubleClick={open}
      title="Duplo clique para renomear"
      className={`block cursor-text break-words ${
        done ? "text-neutral-400 line-through" : "text-neutral-800"
      }`}
    >
      {text}
    </span>
  );
}
