"use client";

import { useActionState, useRef } from "react";
import {
  importarPlanejamentoAction,
  type ImportState,
} from "@/app/admin/planejamentos/actions";

const CAMPO =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export function ImportarPlanejamento({ clientes }: { clientes: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ImportState, FormData>(
    async (prev, formData) => {
      const result = await importarPlanejamentoAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="mb-8 space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-neutral-900">Novo planejamento</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="client_id" required defaultValue="" className={CAMPO} aria-label="Cliente">
          <option value="" disabled>
            Cliente
          </option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="title" required placeholder="Nome (ex.: Novembro 2026)" className={CAMPO} />
      </div>
      <textarea
        name="texto"
        rows={6}
        placeholder="Cole aqui o texto ou o código HTML do artifact"
        className={CAMPO}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-600">
          ou PDF (até 3 MB){" "}
          <input name="pdf" type="file" accept="application/pdf" className="text-sm" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-md bg-(--tatu-ink) px-4 py-2 text-sm font-medium text-white hover:bg-(--tatu-ink)/90 disabled:opacity-60"
        >
          {pending ? "Lendo o material…" : "Importar com IA"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {state.erro ? (
          <span className="text-red-600">{state.erro}</span>
        ) : state.ok ? (
          <span className="text-emerald-600">Pronto. Confira abaixo e publique.</span>
        ) : null}
      </p>
    </form>
  );
}
