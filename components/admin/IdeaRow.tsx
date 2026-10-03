"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import {
  deleteIdeaAction,
  updateIdeaAction,
} from "@/app/admin/area-do-cliente/calendario/actions";
import { CreatorTag } from "@/components/CreatorTag";
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

  // O que está salvo, pra "Cancelar" voltar e "Salvar" saber se mudou algo.
  const [saved, setSaved] = useState({ title: idea.title, notes: idea.notes });

  function save() {
    if (!title.trim()) return;
    setEditing(false);
    if (title === saved.title && notes === saved.notes) return;
    setSaved({ title, notes });
    startTransition(() => updateIdeaAction({ id: idea.id, clientId, title, notes }));
  }

  function cancel() {
    setTitle(saved.title);
    setNotes(saved.notes);
    setEditing(false);
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
          <div
            className="flex-1 space-y-1.5"
            onKeyDown={(e) => e.key === "Escape" && cancel()}
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              aria-label="Título da ideia"
              className="min-h-11 w-full rounded-md border border-neutral-300 px-2 text-sm"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Nota (opcional)"
              aria-label="Nota"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={!title.trim()}
                className="min-h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                Salvar
              </button>
              <button
                onClick={cancel}
                className="min-h-11 rounded-md border border-neutral-300 px-4 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-9 flex-1 py-1.5 text-sm">
              <span className="font-medium">{title}</span>{" "}
              <CreatorTag idea={idea} />
              {notes ? <span className="mt-0.5 block whitespace-pre-line text-neutral-600">{notes}</span> : null}
            </div>
            <button
              onClick={() => setEditing(true)}
              aria-label={`Editar ${title}`}
              title="Editar"
              className="grid size-9 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          </>
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
