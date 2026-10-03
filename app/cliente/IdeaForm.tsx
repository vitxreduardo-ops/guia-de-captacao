"use client";

import { useRef, useState, useTransition } from "react";
import { Lightbulb } from "lucide-react";
import { MONTH_NAMES } from "@/lib/editorialMonths";
import { addIdeaAction } from "./actions";

/**
 * O cliente também anota ideias. Fechado por padrão (a tela é de leitura) e,
 * aberto, só pede o essencial: a ideia e o mês. A nota é opcional.
 */
export function IdeaForm({ months }: { months: { year: number; month: number }[] }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const details = useRef<HTMLDetailsElement>(null);

  return (
    <div>
    <details ref={details} className="group rounded-2xl bg-[var(--tatu-ink)] text-[var(--tatu-cream)]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
        <Lightbulb className="size-5" aria-hidden />
        Tem uma ideia? Anote aqui
      </summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
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
          Qual é a ideia?
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
          Quer contar mais? (opcional)
        </label>
        <textarea
          id="idea-notes"
          name="notes"
          rows={2}
          className="w-full rounded-xl bg-white p-3 text-[var(--tatu-ink)]"
        />
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-full bg-[var(--tatu-cream)] font-semibold text-[var(--tatu-ink)] disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar ideia"}
        </button>
      </form>
    </details>
      <p role="status" className="px-1 pt-2 text-sm text-[var(--tatu-olive)]">
        {done ? "Ideia anotada. Obrigado!" : ""}
      </p>
    </div>
  );
}
