"use client";

import { confirmar } from "@/components/ConfirmHost";
import { useRef, useState, useTransition } from "react";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/expensesTypes";
import { formatBRL } from "@/lib/billingTypes";
import { Janela } from "@/components/admin/financeiro/Acoes";

const paraCampo = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
import type { Expense } from "@/lib/expensesTypes";
import {
  addExpenseAction,
  deleteExpenseAction,
  deleteRecurringAction,
  markExpensePaidAction,
  stopRecurringAction,
  updateExpenseAction,
  updateRecurringAction,
} from "@/app/admin/financeiro/saidas";

export type ClienteOpcao = { id: string; name: string };

function CampoCliente({ clientes, valor }: { clientes: ClienteOpcao[]; valor?: string | null }) {
  if (clientes.length === 0) return null;
  return (
    <label className="block sm:col-span-3">
      <span className="mb-1 block text-sm font-medium text-neutral-600">Gasto de algum cliente? (entra na margem dele)</span>
      <select name="cliente" defaultValue={valor ?? ""} className={CAMPO}>
        <option value="">Não, é do estúdio</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </label>
  );
}

const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] min-h-11";

/** Lançar o que saiu (ou vai sair): o quê, quanto, quando, de que tipo. */
export function SaidasForm({
  today,
  clientes = [],
  clienteInicial = null,
  onDone,
  className = "mb-6 rounded-xl border border-neutral-200 bg-white p-4",
}: {
  today: string;
  clientes?: ClienteOpcao[];
  /** Já vem escolhido quando o gasto é lançado da página de um cliente. */
  clienteInicial?: string | null;
  onDone?: () => void;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [situacao, setSituacao] = useState<"pago" | "pagar">("pago");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(f) =>
        startTransition(async () => {
          await addExpenseAction(f);
          formRef.current?.reset();
          setSituacao("pago");
          onDone?.();
        })
      }
      className={`grid gap-3 sm:grid-cols-[1fr_9rem_10rem] ${className}`}
    >
      <div role="radiogroup" aria-label="Situação" className="flex gap-1 rounded-lg border border-neutral-300 p-1 sm:col-span-3">
        {([["pago", "Já paguei"], ["pagar", "Vou pagar"]] as const).map(([id, rotulo]) => (
          <label
            key={id}
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md text-base ${situacao === id ? "bg-(--tatu-ink) font-medium text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            <input type="radio" name="situacao" value={id} checked={situacao === id} onChange={() => setSituacao(id)} className="sr-only" />
            {rotulo}
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">O que foi?</span>
        <input name="descricao" required placeholder="Ex.: assinatura do Adobe" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">Quanto?</span>
        <input name="valor" required inputMode="decimal" placeholder="R$ 0,00" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">{situacao === "pagar" ? "Vence em" : "Quando?"}</span>
        <input name="data" type="date" required defaultValue={today} className={CAMPO} />
      </label>
      <label className="block sm:col-span-3">
        <span className="mb-1 block text-sm font-medium text-neutral-600">Tipo</span>
        <select name="categoria" defaultValue="outros" className={CAMPO}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </label>
      <CampoCliente clientes={clientes} valor={clienteInicial} />
      <label className="flex min-h-11 items-center gap-2 self-end text-base text-neutral-900 sm:col-span-2">
        <input type="checkbox" name="repete" className="size-5" />
        Repete todo mês (aluguel, assinaturas)
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`self-end rounded-lg bg-(--tatu-ink) px-5 text-base font-medium text-white hover:bg-(--tatu-ink)/90 disabled:opacity-50 ${PRESS}`}
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
  clientes = [],
}: {
  expense: Expense;
  month: string;
  monthName: string;
  clientes?: ClienteOpcao[];
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
            <span className="mb-1 block text-sm font-medium text-neutral-600">O que foi?</span>
            <input name="descricao" required defaultValue={expense.description} autoFocus className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Quanto?</span>
            <input name="valor" required inputMode="decimal" defaultValue={paraCampo(expense.amountCents)} className={CAMPO} />
          </label>
          {fixa ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Dia do mês</span>
              <input name="dia" type="number" min={1} max={31} required defaultValue={Number(expense.spentOn.slice(8, 10))} className={CAMPO} />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Quando?</span>
              <input name="data" type="date" required defaultValue={expense.spentOn} className={CAMPO} />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Tipo</span>
            <select name="categoria" defaultValue={expense.category} className={CAMPO}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
          {fixa ? null : <CampoCliente clientes={clientes} valor={expense.clientId} />}
          <div className="flex items-end gap-2">
            <button type="submit" disabled={pending} className={`rounded-lg bg-(--tatu-ink) px-5 text-base font-medium text-white hover:bg-(--tatu-ink)/90 disabled:opacity-50 ${PRESS}`}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className={`rounded-lg px-3 text-base text-neutral-600 underline ${PRESS}`}>
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
          {EXPENSE_CATEGORY_LABELS[expense.category]}
          {expense.clientName ? ` · ${expense.clientName}` : ""} ·{" "}
          {expense.paid ? "" : "vence "}
          {new Date(`${expense.spentOn}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
        </p>
      </div>
      {expense.paid ? null : (
        <span className="rounded-md bg-amber-100 px-2 py-1 text-sm text-amber-900">A pagar</span>
      )}
      <span className="text-base font-medium text-neutral-900 tabular-nums">{formatBRL(expense.amountCents)}</span>
      {!expense.paid && !expense.recurringId ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const f = new FormData();
            f.set("id", expense.id);
            startTransition(() => markExpensePaidAction(f));
          }}
          className={`rounded-lg bg-(--tatu-ink) px-4 text-base font-medium text-white hover:bg-(--tatu-ink)/90 disabled:opacity-50 ${PRESS}`}
        >
          Paguei
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label={`Editar ${expense.description || "saída"}`}
        className={`rounded-lg border border-neutral-300 px-4 text-base text-neutral-900 hover:bg-neutral-50 ${PRESS}`}
      >
        Editar
      </button>
      {expense.recurringId ? (
        <>
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-sm text-neutral-600">Todo mês</span>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!(await confirmar(`Parar de repetir "${expense.description}" depois deste mês? Os meses até aqui continuam contando.`, "Parar de repetir"))) return;
              const f = new FormData();
              f.set("id", expense.recurringId!);
              f.set("mes", month);
              startTransition(() => stopRecurringAction(f));
            }}
            className={`rounded-lg px-3 text-sm text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50 ${PRESS}`}
          >
            Parar de repetir
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!(await confirmar(`Apagar "${expense.description}" de TODOS os meses? Use só se foi lançada errado.`, "Apagar"))) return;
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
          onClick={async () => {
            if (!(await confirmar(`Apagar "${expense.description}" de ${formatBRL(expense.amountCents)}?`, "Apagar"))) return;
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

/** "+ Lançar saída": o formulário numa janela, aberta de qualquer aba do Financeiro. */
export function LancarSaida({
  today,
  clientes,
  clienteInicial = null,
  variante = "cheio",
}: {
  today: string;
  clientes: ClienteOpcao[];
  clienteInicial?: string | null;
  variante?: "cheio" | "claro" | "contorno";
}) {
  return (
    <Janela rotulo="+ Lançar saída" titulo="Lançar saída" variante={variante}>
      {(fechar) => <SaidasForm today={today} clientes={clientes} clienteInicial={clienteInicial} onDone={fechar} className="" />}
    </Janela>
  );
}
