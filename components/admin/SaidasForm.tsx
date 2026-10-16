"use client";

import { useRef, useState, useTransition } from "react";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/expensesTypes";
import { formatBRL } from "@/lib/billingTypes";

const paraCampo = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
import type { Expense } from "@/lib/expensesTypes";
import {
  addExpenseAction,
  deleteExpenseAction,
  deleteRecurringAction,
  stopRecurringAction,
  updateExpenseAction,
  updateRecurringAction,
} from "@/app/admin/clientes/dinheiro/saidas";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] min-h-11";

/** Lançar o que saiu é uma linha só: o quê, quanto, quando, de que tipo. */
export function SaidasForm({ today }: { today: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(f) =>
        startTransition(async () => {
          await addExpenseAction(f);
          formRef.current?.reset();
        })
      }
      className="mb-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_9rem_10rem]"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">O que foi?</span>
        <input name="descricao" required placeholder="Ex.: assinatura do Adobe" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Quanto?</span>
        <input name="valor" required inputMode="decimal" placeholder="R$ 0,00" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Quando?</span>
        <input name="data" type="date" required defaultValue={today} className={CAMPO} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Tipo</span>
        <select name="categoria" defaultValue="outros" className={CAMPO}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 self-end text-base text-neutral-800 sm:col-span-2">
        <input type="checkbox" name="repete" className="size-5" />
        Repete todo mês (aluguel, assinaturas)
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`self-end rounded-lg bg-neutral-900 px-5 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
      >
        {pending ? "Salvando…" : "Lançar saída"}
      </button>
    </form>
  );
}

export function SaidaLinha({
  expense,
  month,
  monthName,
}: {
  expense: Expense;
  month: string;
  monthName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);

  if (editando) {
    const fixa = Boolean(expense.recurringId);
    return (
      <li className="px-4 py-3">
        <form
          action={(f) =>
            startTransition(async () => {
              await (fixa ? updateRecurringAction(f) : updateExpenseAction(f));
              setEditando(false);
            })
          }
          className="grid gap-3 sm:grid-cols-[1fr_9rem_10rem]"
        >
          <input type="hidden" name="id" value={fixa ? expense.recurringId : expense.id} />
          <input type="hidden" name="mes" value={month} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">O que foi?</span>
            <input name="descricao" required defaultValue={expense.description} autoFocus className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Quanto?</span>
            <input name="valor" required inputMode="decimal" defaultValue={paraCampo(expense.amountCents)} className={CAMPO} />
          </label>
          {fixa ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Dia do mês</span>
              <input name="dia" type="number" min={1} max={31} required defaultValue={Number(expense.spentOn.slice(8, 10))} className={CAMPO} />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Quando?</span>
              <input name="data" type="date" required defaultValue={expense.spentOn} className={CAMPO} />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Tipo</span>
            <select name="categoria" defaultValue={expense.category} className={CAMPO}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={pending} className={`rounded-lg bg-neutral-900 px-5 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className={`rounded-lg px-3 text-base text-neutral-700 underline ${PRESS}`}>
              Cancelar
            </button>
          </div>
          {fixa ? (
            <p className="text-sm text-neutral-600 sm:col-span-3">
              A mudança vale de {monthName} em diante. Os meses anteriores continuam como estavam.
            </p>
          ) : null}
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1 basis-44">
        <p className="text-base text-neutral-900">{expense.description || "Sem descrição"}</p>
        <p className="text-sm text-neutral-500">
          {EXPENSE_CATEGORY_LABELS[expense.category]} ·{" "}
          {new Date(`${expense.spentOn}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
        </p>
      </div>
      <span className="text-base font-medium text-neutral-900 tabular-nums">{formatBRL(expense.amountCents)}</span>
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label={`Editar ${expense.description || "saída"}`}
        className={`rounded-lg border border-neutral-300 px-4 text-base text-neutral-800 hover:bg-neutral-50 ${PRESS}`}
      >
        Editar
      </button>
      {expense.recurringId ? (
        <>
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-sm text-neutral-700">Todo mês</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Parar de repetir "${expense.description}" depois deste mês? Os meses até aqui continuam contando.`)) return;
              const f = new FormData();
              f.set("id", expense.recurringId!);
              f.set("mes", month);
              startTransition(() => stopRecurringAction(f));
            }}
            className={`rounded-lg px-3 text-sm text-neutral-700 underline hover:text-neutral-900 disabled:opacity-50 ${PRESS}`}
          >
            Parar de repetir
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Apagar "${expense.description}" de TODOS os meses? Use só se foi lançada errado.`)) return;
              const f = new FormData();
              f.set("id", expense.recurringId!);
              startTransition(() => deleteRecurringAction(f));
            }}
            className={`rounded-lg px-3 text-sm text-red-700 underline hover:text-red-800 disabled:opacity-50 ${PRESS}`}
          >
            Apagar
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Apagar "${expense.description}" de ${formatBRL(expense.amountCents)}?`)) return;
            const f = new FormData();
            f.set("id", expense.id);
            startTransition(() => deleteExpenseAction(f));
          }}
          className={`rounded-lg px-3 text-sm text-red-700 underline hover:text-red-800 disabled:opacity-50 ${PRESS}`}
        >
          Apagar
        </button>
      )}
    </li>
  );
}
