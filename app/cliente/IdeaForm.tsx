"use client";

import { useRef, useState, useTransition } from "react";
import { Lightbulb } from "lucide-react";
import { MONTH_NAMES } from "@/lib/editorialMonths";
import { addIdeaAction } from "./actions";

/**
 * O cliente também sugere ideias. Fechado por padrão (a tela é de consulta)
 * e, aberto, só pede o essencial: a ideia e o mês. Na prévia do painel o
 * formulário aparece, mas não envia, para a equipe ver o que o cliente vê.
 */
export function IdeaForm({
  months,
  readOnly = false,
}: {
  months: { year: number; month: number }[];
  readOnly?: boolean;
}) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const details = useRef<HTMLDetailsElement>(null);

  return (
    <div>
      <details ref={details} className="group rounded-2xl bg-[var(--tatu-ink)] text-[var(--tatu-cream)]">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          <Lightbulb className="size-5" aria-hidden />
          Sugerir uma ideia
        </summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (readOnly) return;
            const form = event.currentTarget;
            const data = new FormData(form);
            startTransition(async () => {
              await addIdeaAction(data);
              form.reset();
              setDone(true);
              if (details.current) details.current.open = false;
              setTimeout(() => setDone(false), 3000);
            });
          }}
          className="space-y-3 px-4 pb-4"
        >
          <label className="block text-sm font-medium" htmlFor="idea-title">
            Qual é a sua ideia?
          </label>
          <input
            id="idea-title"
            name="title"
            required
            autoComplete="off"
            className="min-h-12 w-full rounded-xl bg-white px-3 text-[var(--tatu-ink)]"
          />
          <label className="block text-sm font-medium" htmlFor="idea-when">
            Para qual mês?
          </label>
          <select
            id="idea-when"
            name="when"
            className="min-h-12 w-full rounded-xl bg-white px-3 text-[var(--tatu-ink)]"
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
            rows={2}
            className="w-full rounded-xl bg-white p-3 text-[var(--tatu-ink)]"
          />
          <button
            disabled={pending || readOnly}
            className="min-h-12 w-full rounded-full bg-[var(--tatu-cream)] font-semibold text-[var(--tatu-ink)] disabled:opacity-60"
          >
            {readOnly ? "Indisponível na visualização" : pending ? "Enviando…" : "Enviar sugestão"}
          </button>
        </form>
      </details>
      <p role="status" className="px-1 pt-2 text-sm text-[var(--tatu-olive)]">
        {done ? "Sugestão registrada. Obrigado." : ""}
      </p>
    </div>
  );
}
