"use client";

import { useTransition } from "react";
import { DEFAULT_INVOICE_CLOSING, formatBRL } from "@/lib/billingTypes";
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
        {/* Baixar vem antes de reabrir: mandar o relatório junto com a nota é
            o que se faz todo mês; reabrir é a exceção que apaga a nota.

            O recado do fim do relatório muda de cliente pra cliente, então o
            botão abre o texto pra revisar antes de gerar o arquivo. Form GET
            comum: o próprio navegador monta a URL da rota, sem estado nem
            requisição extra. Apagar tudo é uma escolha — sai sem recado. */}
        <details className="ml-auto w-full sm:w-auto sm:open:w-full">
          <summary
            className={`inline-flex cursor-pointer list-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 ${PRESS}`}
          >
            Baixar PDF
          </summary>
          <form
            action="/admin/clientes/faturamento/pdf"
            className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 p-3"
          >
            <input type="hidden" name="cliente" value={clientId} />
            <input type="hidden" name="mes" value={month} />
            <label
              htmlFor={`fecho-${month}`}
              className="block text-xs font-medium text-neutral-700"
            >
              Recado no fim do relatório
            </label>
            <textarea
              id={`fecho-${month}`}
              name="texto"
              rows={5}
              defaultValue={DEFAULT_INVOICE_CLOSING}
              className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none sm:w-96"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Linha em branco separa parágrafo. Campo vazio gera o relatório sem
              recado.
            </p>
            <button
              type="submit"
              className={`mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 ${PRESS}`}
            >
              Baixar PDF
            </button>
          </form>
        </details>
        <form
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
