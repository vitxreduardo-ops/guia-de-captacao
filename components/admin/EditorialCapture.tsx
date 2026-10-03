"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { createIdeaAction } from "@/app/admin/clientes/calendario/actions";
import { MONTH_NAMES } from "@/lib/editorialMonths";

/**
 * Anotar uma ideia é um campo e Enter. O mês é um chip (o atual já vem
 * marcado) e os campos completos ficam atrás de "Mais campos", fechados:
 * quem anota em pé, entre uma gravação e outra, não pode pagar por eles.
 */
export function EditorialCapture({
  clientId,
  months,
}: {
  clientId: string;
  months: { year: number; month: number }[];
}) {
  const [more, setMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const title = useRef<HTMLInputElement>(null);

  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          await createIdeaAction(data);
          form.current?.reset();
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
          title.current?.focus();
        });
      }}
      className="rounded-xl border border-neutral-200 p-3"
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex gap-2">
        <input
          ref={title}
          name="title"
          required
          autoFocus
          autoComplete="off"
          aria-label="Nova ideia"
          placeholder="Anotar ideia… (Enter salva)"
          className="min-h-11 flex-1 rounded-lg border border-neutral-300 px-3 text-sm"
        />
        <button
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden />
          {pending ? "Salvando" : "Anotar"}
        </button>
      </div>

      <fieldset className="mt-3">
        <legend className="sr-only">Mês da ideia</legend>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {months.map(({ year, month }, i) => (
            <label key={`${year}-${month}`} className="shrink-0">
              <input
                type="radio"
                name="when"
                value={`${year}-${month}`}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-neutral-300 px-3 text-sm text-neutral-700 peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 peer-focus-visible:ring-offset-2">
                {MONTH_NAMES[month - 1].slice(0, 3)}
                {month === 1 || i === 0 ? ` ${String(year).slice(2)}` : ""}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
        >
          Mais campos
          <ChevronDown className={`size-4 transition-transform ${more ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <span role="status" className="text-sm text-emerald-700">
          {saved ? "Ideia anotada ✓" : ""}
        </span>
      </div>

      {more ? (
        <div className="mt-2 space-y-2">
          <textarea
            name="notes"
            rows={2}
            placeholder="Nota (opcional)"
            aria-label="Nota"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <label className="flex min-h-9 items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="internal" />
            Só equipe (o cliente não vê)
          </label>
        </div>
      ) : null}
    </form>
  );
}
