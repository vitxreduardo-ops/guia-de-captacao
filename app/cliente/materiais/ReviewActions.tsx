"use client";

import { useFormStatus } from "react-dom";
import { approveCardAction, requestChangesAction } from "../actions";

function Submit({ children, primary = false }: { children: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`min-h-12 w-full rounded-full px-5 font-semibold transition-opacity disabled:opacity-60 ${
        primary ? "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]" : "border border-[var(--tatu-border)]"
      }`}
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}

/**
 * As duas decisões lado a lado. O ajuste abre o campo só quando escolhido, e
 * depois de qualquer uma o portal segue para o próximo material pendente.
 */
export function ReviewActions({ cardId }: { cardId: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <details className="group col-span-1 [&[open]]:col-span-2 [&[open]]:order-2">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--tatu-border)] font-semibold [&::-webkit-details-marker]:hidden group-open:hidden">
            Solicitar ajuste
          </summary>
          <form action={requestChangesAction} className="space-y-2">
            <input type="hidden" name="cardId" value={cardId} />
            <label className="block text-sm font-medium" htmlFor={`fb-${cardId}`}>
              Qual ajuste você gostaria de solicitar?
            </label>
            <textarea
              id={`fb-${cardId}`}
              name="feedback"
              required
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-[var(--tatu-border)] bg-white p-3"
            />
            <Submit>Enviar solicitação</Submit>
          </form>
        </details>
        <form action={approveCardAction} className="col-span-1">
          <input type="hidden" name="cardId" value={cardId} />
          <Submit primary>Aprovar</Submit>
        </form>
      </div>
    </div>
  );
}
