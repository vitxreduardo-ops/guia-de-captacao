"use client";

import { useState, useTransition } from "react";
import { setColumnClientVisibleAction } from "@/app/admin/area-do-cliente/actions";

/** Um interruptor por coluna: grava ao tocar, sem botão de salvar. */
export function ColumnVisibilityRow({
  id,
  name,
  color,
  cards,
  initial,
}: {
  id: string;
  name: string;
  color: string;
  cards: number;
  initial: boolean;
}) {
  const [visible, setVisible] = useState(initial);
  const [, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-neutral-500">
          {cards} {cards === 1 ? "entrega" : "entregas"} de clientes
        </p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          role="switch"
          checked={visible}
          onChange={(e) => {
            const next = e.target.checked;
            setVisible(next);
            startTransition(() => setColumnClientVisibleAction(id, next));
          }}
          className="size-5"
        />
        {visible ? "Cliente vê" : "Só equipe"}
      </label>
    </li>
  );
}
