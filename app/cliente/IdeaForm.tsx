"use client";

import { useRef, useState, useTransition } from "react";
import { Lightbulb, X } from "lucide-react";
import { MONTH_NAMES } from "@/lib/editorialMonths";
import { addIdeaAction } from "./actions";

/**
 * Botão pequeno que abre a janela de sugestão. A janela é um <dialog>
 * nativo: foco preso, Esc fecha, e há botão de fechar visível. Na prévia do
 * painel ela abre, mas não envia, para a equipe ver o que o cliente vê.
 */
export function IdeaForm({
  months,
  readOnly = false,
}: {
  months: { year: number; month: number }[];
  readOnly?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--tatu-ink)] px-4 text-sm font-semibold text-[var(--tatu-cream)]"
      >
        <Lightbulb className="size-4" aria-hidden />
        Sugerir ideia
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="idea-heading"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-[var(--tatu-cream)] p-0 text-[var(--tatu-ink)] backdrop:bg-black/40 md:m-auto md:max-w-md md:rounded-3xl"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (readOnly) return;
            const form = event.currentTarget;
            const data = new FormData(form);
            startTransition(async () => {
              await addIdeaAction(data);
              form.reset();
              dialog.current?.close();
              setDone(true);
              setTimeout(() => setDone(false), 3500);
            });
          }}
          className="space-y-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="idea-heading" className="text-xl font-semibold">
              Sugerir uma ideia
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Fechar"
              className="-m-2 grid size-11 place-items-center rounded-full hover:bg-white/60"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <label className="block text-sm font-medium" htmlFor="idea-title">
            Qual é a sua ideia?
          </label>
          <input
            id="idea-title"
            name="title"
            required
            autoComplete="off"
            className="min-h-12 w-full rounded-xl border border-[var(--tatu-border)] bg-white px-3"
          />
          <label className="block text-sm font-medium" htmlFor="idea-when">
            Para qual mês?
          </label>
          <select
            id="idea-when"
            name="when"
            className="min-h-12 w-full rounded-xl border border-[var(--tatu-border)] bg-white px-3"
          >
            {months.map(({ year, month }) => (
              <option key={`${year}-${month}`} value={`${year}-${month}`}>
                {MONTH_NAMES[month - 1]} {year}
              </option>
            ))}
          </select>
          <label className="block text-sm font-medium" htmlFor="idea-notes">
            Detalhes (opcional)
          </label>
          <textarea
            id="idea-notes"
            name="notes"
            rows={3}
            className="w-full rounded-xl border border-[var(--tatu-border)] bg-white p-3"
          />

          {readOnly ? (
            <p className="text-sm text-[var(--tatu-muted)]">
              Indisponível na visualização do painel.
            </p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="min-h-12 flex-1 rounded-full border border-[var(--tatu-border)] font-semibold"
            >
              Cancelar
            </button>
            <button
              disabled={pending || readOnly}
              className="min-h-12 flex-1 rounded-full bg-[var(--tatu-ink)] font-semibold text-[var(--tatu-cream)] disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      </dialog>

      <p
        role="status"
        className={`fixed inset-x-5 bottom-24 z-30 mx-auto max-w-sm rounded-full bg-[var(--tatu-ink)] px-4 py-3 text-center text-sm text-[var(--tatu-cream)] transition-opacity md:bottom-8 ${
          done ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {done ? "Sugestão registrada. Obrigado." : ""}
      </p>
    </>
  );
}
