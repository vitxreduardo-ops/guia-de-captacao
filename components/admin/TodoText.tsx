"use client";

import { useRef } from "react";

/**
 * Texto da tarefa com renomear por duplo clique. Quem grava é a lista, que é
 * dona do estado otimista — aqui só sai o texto novo. Salva no Enter ou ao
 * perder o foco, descarta no Escape.
 */
export function TodoText({
  text,
  done,
  editing,
  onEditingChange,
  onRename,
}: {
  text: string;
  done: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onRename: (text: string) => void;
}) {
  // Fechar a edição tira o foco do input e dispara o onBlur. Sem esta trava o
  // Escape cancelaria e o blur logo em seguida salvaria assim mesmo.
  const skipBlur = useRef(false);

  function save(value: string) {
    skipBlur.current = true;
    const trimmed = value.trim();
    onEditingChange(false);
    // Vazio apagaria a tarefa da vista sem apagar do banco.
    if (trimmed && trimmed !== text) onRename(trimmed);
  }

  function cancel() {
    skipBlur.current = true;
    onEditingChange(false);
  }

  if (editing) {
    return (
      <input
        // Remonta ao reabrir, então o valor inicial é sempre o texto atual —
        // outra pessoa pode ter renomeado enquanto isso.
        defaultValue={text}
        autoFocus
        aria-label="Renomear tarefa"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save(event.currentTarget.value);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        onBlur={(event) => {
          if (skipBlur.current) {
            skipBlur.current = false;
            return;
          }
          save(event.currentTarget.value);
        }}
        className="w-full rounded border border-neutral-400 px-1.5 py-0.5 text-sm text-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      />
    );
  }

  return (
    <span
      onDoubleClick={() => onEditingChange(true)}
      className={`block cursor-text break-words ${
        done ? "text-neutral-400 line-through" : "text-neutral-800"
      }`}
    >
      {text}
    </span>
  );
}
