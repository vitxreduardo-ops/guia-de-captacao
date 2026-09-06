"use client";

import { useTransition } from "react";
import { formatBRL } from "@/lib/billingTypes";
import {
  closeMonthAction,
  reopenInvoiceAction,
} from "@/app/admin/clientes/faturamento/actions";

const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11";

/**
 * Fechamento do mês. É a única ação da seção que mexe em dinheiro já cobrado,
 * então as duas direções perguntam antes: fechar congela o valor, reabrir
 * apaga a nota que existe. O texto da pergunta nomeia cliente, mês e total —
 * confirmar sem saber o que se confirma não protege ninguém.
 */
export function CloseMonthForm({
  clientId,
  clientName,
  month,
  monthLabel,
  totalCents,
  itemCount,
  zeroPriceCount,
  invoice,
}: {
  clientId: string;
  clientName: string;
  month: string;
  monthLabel: string;
  totalCents: number;
  itemCount: number;
  /** Entregas sem valor lançado: entram na nota valendo zero. */
  zeroPriceCount: number;
  invoice: { id: string; total_cents: number; closed_at: string } | null;
}) {
  const [pending, startTransition] = useTransition();

  if (invoice) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-emerald-700">
          Mês fechado em{" "}
          {new Date(invoice.closed_at).toLocaleDateString("pt-BR")} —{" "}
          <strong className="tabular-nums">
            {formatBRL(invoice.total_cents)}
          </strong>{" "}
          na nota. Editar as entregas agora não muda mais esse valor.
        </p>
        <form
          className="ml-auto"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            if (
              !window.confirm(
                `Reabrir ${monthLabel} de ${clientName}? A nota de ${formatBRL(
                  invoice.total_cents
                )} será apagada, e o total volta a acompanhar o quadro de entregas.`
              )
            ) {
              return;
            }
            startTransition(() => reopenInvoiceAction(formData));
          }}
        >
          <input type="hidden" name="id" value={invoice.id} />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Reabrir mês
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (
          !window.confirm(
            `Fechar ${monthLabel} de ${clientName}: ${itemCount} ${
              itemCount === 1 ? "entrega" : "entregas"
            }, ${formatBRL(totalCents)}.\n\nO valor fica congelado — editar ou ` +
              `excluir uma entrega depois não muda mais a nota. Dá pra reabrir se precisar.`
          )
        ) {
          return;
        }
        startTransition(() => closeMonthAction(formData));
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="month" value={month} />

      {zeroPriceCount > 0 ? (
        <p className="w-full text-xs text-amber-700">
          {zeroPriceCount === 1
            ? "1 entrega está sem valor lançado e entra na nota valendo zero."
            : `${zeroPriceCount} entregas estão sem valor lançado e entram na nota valendo zero.`}
        </p>
      ) : null}

      <input
        name="notes"
        placeholder="Observação da nota (opcional)"
        className="min-w-[12rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={itemCount === 0 || pending}
        className={`rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40 ${PRESS}`}
      >
        {pending
          ? "Fechando…"
          : `Fechar mês · ${itemCount} ${
              itemCount === 1 ? "entrega" : "entregas"
            } · ${formatBRL(totalCents)}`}
      </button>
    </form>
  );
}
