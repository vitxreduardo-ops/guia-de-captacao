"use client";

import { useState, useTransition } from "react";
import { confirmar } from "@/components/ConfirmHost";
import { formatBRL } from "@/lib/billingTypes";
import { diaPorExtenso } from "@/lib/dinheiroTexto";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/backlogTypes";
import { markUnpaidAction, updateReceivedAction } from "@/app/admin/financeiro/actions";
import { BOTAO } from "@/components/admin/financeiro/ui";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const paraCampo = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export interface Entrada {
  cardId: string;
  name: string;
  title: string;
  date: string;
  cents: number;
  method: string | null;
}

/** Um recebimento. Editar corrige valor, dia e forma; "Desfazer" devolve a entrega para a espera. */
export function EntradaLinha({
  entrada,
  mostrarCliente = true,
  mostrarData = false,
}: {
  entrada: Entrada;
  mostrarCliente?: boolean;
  /** Fora do Extrato (que já agrupa por dia), a linha diz quando entrou. */
  mostrarData?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [pending, start] = useTransition();
  const forma = entrada.method ? (PAYMENT_METHOD_LABELS[entrada.method as PaymentMethod] ?? entrada.method) : null;

  if (editando) {
    return (
      <li className="px-4 py-3">
        <form
          action={(f) =>
            start(async () => {
              await updateReceivedAction(f);
              setEditando(false);
            })
          }
          className="grid gap-3 sm:grid-cols-3"
        >
          <input type="hidden" name="card" value={entrada.cardId} />
          <p className="text-base font-medium text-neutral-900 sm:col-span-3">
            {mostrarCliente ? `${entrada.name} · ` : ""}{entrada.title || "Entrega"}
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Quanto entrou</span>
            <input name="valor" required inputMode="decimal" autoFocus defaultValue={paraCampo(entrada.cents)} className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Dia do pagamento</span>
            <input name="data" type="date" required defaultValue={entrada.date} className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Como pagou</span>
            <select name="method" defaultValue={entrada.method ?? "pix"} className={CAMPO}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m as PaymentMethod]}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
            <button type="submit" disabled={pending} className={BOTAO.cheio}>{pending ? "Salvando…" : "Salvar"}</button>
            <button type="button" onClick={() => setEditando(false)} className={BOTAO.contorno}>Cancelar</button>
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                if (!(await confirmar(`Desfazer o recebimento de ${formatBRL(entrada.cents)}? A entrega volta para "a receber".`, "Desfazer"))) return;
                const f = new FormData();
                f.set("card", entrada.cardId);
                start(() => markUnpaidAction(f));
              }}
              className="ml-auto min-h-11 rounded-lg px-3 text-base text-red-700 underline hover:text-red-800 disabled:opacity-50"
            >
              Desfazer recebimento
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1 basis-44">
        <p className="text-base text-neutral-900">
          {mostrarCliente ? entrada.name : entrada.title || "Entrega"}
        </p>
        <p className="text-sm text-neutral-500">
          Recebido{forma ? ` por ${forma}` : ""}
          {mostrarData && entrada.date ? ` · ${diaPorExtenso(entrada.date)}` : ""}
          {mostrarCliente && entrada.title ? ` · ${entrada.title}` : ""}
        </p>
      </div>
      <span className="text-base font-medium tabular-nums text-(--tatu-ink)">+ {formatBRL(entrada.cents)}</span>
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label={`Editar recebimento de ${entrada.name}`}
        className={BOTAO.contorno}
      >
        Editar
      </button>
    </li>
  );
}
