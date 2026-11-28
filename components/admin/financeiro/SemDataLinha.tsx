"use client";

import { useState, useTransition } from "react";
import { formatBRL } from "@/lib/billingTypes";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/backlogTypes";
import { updateReceivedAction } from "@/app/admin/financeiro/actions";
import { BOTAO } from "@/components/admin/financeiro/ui";
import type { SemDataRow } from "@/lib/dinheiro";

const CAMPO =
  "min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";

/** Entrega marcada como paga mas sem dia do pagamento: pergunta o dia e a forma. */
export function SemDataLinha({ r }: { r: SemDataRow }) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-500" />
      <div className="min-w-0 flex-1 basis-44">
        <p className="text-base text-neutral-900">
          <span className="font-medium">{r.name}</span> pagou, mas falta o dia
        </p>
        <p className="text-sm text-neutral-500">
          {r.title || "Entrega"} · {formatBRL(r.cents)} · fora do Extrato e do caixa
        </p>
      </div>
      {aberto ? (
        <form
          action={(f) =>
            start(async () => {
              await updateReceivedAction(f);
              setAberto(false);
            })
          }
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="card" value={r.cardId} />
          <input type="hidden" name="valor" value={(r.cents / 100).toFixed(2).replace(".", ",")} />
          <input name="data" type="date" required autoFocus defaultValue={r.date} aria-label="Dia do pagamento" className={CAMPO} />
          <select name="method" defaultValue="pix" aria-label="Como pagou" className={CAMPO}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m as PaymentMethod]}</option>
            ))}
          </select>
          <button type="submit" disabled={pending} className={BOTAO.cheio}>{pending ? "Salvando…" : "Salvar"}</button>
          <button type="button" onClick={() => setAberto(false)} className={BOTAO.contorno}>Cancelar</button>
        </form>
      ) : (
        <button type="button" onClick={() => setAberto(true)} className={BOTAO.cheio}>Informar dia</button>
      )}
    </li>
  );
}
