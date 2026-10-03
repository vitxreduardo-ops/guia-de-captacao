"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import {
  deleteIdeaAction,
  updateIdeaAction,
} from "@/app/admin/clientes/calendario/actions";
import type { EditorialIdea } from "@/lib/editorialMonths";

const UNDO_MS = 5000;

/**
 * Uma ideia, editável no lugar: tocar no texto edita, o olho alterna entre
 * "o cliente vê" e "só equipe", e excluir dá cinco segundos pra desfazer
 * antes de apagar de verdade (apagar sem volta é o erro que dói à toa).
 */
export function IdeaRow({ idea, clientId }: { idea: EditorialIdea; clientId: string }) {
  const [title, setTitle] = useState(idea.title);
  const [notes, setNotes] = useState(idea.notes);
  const [internal, setInternal] = useState(idea.internal);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function save() {
    setEditing(false);
    if (title === idea.title && notes === idea.notes) return;
    startTransition(() => updateIdeaAction({ id: idea.id, clientId, title, notes }));
  }

  function toggleVisibility() {
    const next = !internal;
    setInternal(next);
    startTransition(() => updateIdeaAction({ id: idea.id, clientId, internal: next }));
  }

  function remove() {
    setRemoving(true);
    timer.current = setTimeout(() => {
      startTransition(() => deleteIdeaAction(idea.id, clientId));
    }, UNDO_MS);
  }

  if (removing) {
    return (
      <li className="flex min-h-11 items-center justify-between rounded-lg bg-neutral-100 px-3 text-sm text-neutral-600">
        Ideia removida
        <button
          onClick={() => {
            clearTimeout(timer.current);
            setRemoving(false);
          }}
          className="min-h-9 px-2 font-medium text-neutral-900 underline underline-offset-4"
        >
          Desfazer
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-lg bg-neutral-50 px-3 py-2">
      <div className="flex items-start gap-2">
        {editing ? (
          <div className="flex-1 space-y-1.5" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) save(); }}>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              aria-label="Título da ideia"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Nota (opcional)"
              aria-label="Nota"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="min-h-9 flex-1 text-left text-sm">
            <span className="font-medium">{title}</span>
            {notes ? <span className="mt-0.5 block whitespace-pre-line text-neutral-600">{notes}</span> : null}
          </button>
        )}
        <button
          onClick={toggleVisibility}
          aria-pressed={internal}
          title={internal ? "Só equipe: o cliente não vê" : "O cliente vê"}
          className={`grid size-9 shrink-0 place-items-center rounded-md hover:bg-neutral-200 ${internal ? "text-amber-700" : "text-neutral-500"}`}
        >
          {internal ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          <span className="sr-only">{internal ? "Só equipe" : "Cliente vê"}</span>
        </button>
        <button
          onClick={remove}
          aria-label={`Excluir ${title}`}
          className="grid size-9 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-red-700"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}
