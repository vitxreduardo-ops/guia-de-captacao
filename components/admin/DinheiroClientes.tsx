"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatBRL, INVOICE_PAYMENT_PRESETS } from "@/lib/billingTypes";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/backlogTypes";
import type { PaymentMethod } from "@/lib/backlogTypes";
import type { MoneyClient, MoneyItem } from "@/lib/dinheiroTypes";
import { diaPorExtenso, frasePrazo, linkWhatsApp } from "@/lib/dinheiroTexto";
import {
  markPaidAction,
  markPartialAction,
  markUnpaidAction,
} from "@/app/admin/clientes/dinheiro/actions";

const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] min-h-11";

function SeletorForma({ id }: { id: string }) {
  return (
    <select
      id={id}
      name="method"
      defaultValue="pix"
      aria-label="Como pagou"
      className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base"
    >
      {PAYMENT_METHODS.map((m) => (
        <option key={m} value={m}>
          {PAYMENT_METHOD_LABELS[m as PaymentMethod]}
        </option>
      ))}
    </select>
  );
}

function ItemLinha({ item }: { item: MoneyItem }) {
  const [pending, startTransition] = useTransition();
  const [parcial, setParcial] = useState(false);
  const dados = () => {
    const f = new FormData();
    f.append("card", item.cardId);
    return f;
  };
  const entrou = item.receivedCents > 0 && !item.paid;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-base text-neutral-900">{item.title || "Sem título"}</p>
          <p className="text-sm text-neutral-500">
            {item.serviceName ?? "Sem serviço"}
            {item.date ? ` · ${diaPorExtenso(item.date)}` : ""}
          </p>
          {entrou ? (
            <p className="text-sm text-amber-700">
              Já entrou {formatBRL(item.receivedCents)} · falta {formatBRL(item.openCents)}
            </p>
          ) : null}
        </div>
        <span className="text-base font-medium text-neutral-900 tabular-nums">
          {formatBRL(item.totalCents)}
        </span>
        {item.paid ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => markUnpaidAction(dados()))}
            className={`rounded-lg bg-emerald-50 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 ${PRESS}`}
            title="Clique para desfazer"
            aria-label={`${item.title || "Entrega"}: pago. Clique para desfazer`}
          >
            ✓ Pago
            {item.method ? ` no ${PAYMENT_METHOD_LABELS[item.method as PaymentMethod] ?? item.method}` : ""}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setParcial(!parcial)}
              aria-expanded={parcial}
              aria-label={`Recebi uma parte de ${item.title || "esta entrega"}`}
              className={`rounded-lg px-3 text-sm text-neutral-600 underline hover:text-neutral-900 ${PRESS}`}
            >
              Recebi uma parte
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => markPaidAction(dados()))}
              aria-label={`${entrou ? "Recebi o resto de" : "Recebi"} ${item.title || "esta entrega"}`}
              className={`rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 ${PRESS}`}
            >
              {pending ? "Salvando…" : entrou ? "Recebi o resto" : "Recebi"}
            </button>
          </div>
        )}
      </div>

      {parcial && !item.paid ? (
        <form
          action={(f) =>
            startTransition(async () => {
              await markPartialAction(f);
              setParcial(false);
            })
          }
          className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 p-3"
        >
          <input type="hidden" name="card" value={item.cardId} />
          <label className="text-base text-neutral-700" htmlFor={`parte-${item.cardId}`}>
            Quanto entrou agora?
          </label>
          <input
            id={`parte-${item.cardId}`}
            name="valor"
            inputMode="decimal"
            required
            autoFocus
            placeholder="R$ 0,00"
            className="min-h-11 w-32 rounded-lg border border-neutral-300 px-3 text-base"
          />
          <SeletorForma id={`forma-parte-${item.cardId}`} />
          <button
            type="submit"
            disabled={pending}
            className={`rounded-lg bg-neutral-900 px-4 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
          >
            Guardar
          </button>
        </form>
      ) : null}
    </li>
  );
}

const STATUS = {
  pago: { texto: "text-emerald-700", ponto: "bg-emerald-500" },
  aberto: { texto: "text-amber-700", ponto: "bg-amber-500" },
  atrasado: { texto: "text-red-700", ponto: "bg-red-500" },
} as const;

function ClienteLinha({
  client,
  mes,
  mesNome,
  aberto: abertoInicial,
}: {
  client: MoneyClient;
  mes: string;
  mesNome: string;
  aberto: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [pending, startTransition] = useTransition();
  const cor = STATUS[client.status];
  const wa = client.status !== "pago" ? linkWhatsApp(client, mesNome, client.openCents) : null;

  const resumo =
    client.status === "pago"
      ? `Tudo pago · ${formatBRL(client.paidCents)}`
      : `Falta ${formatBRL(client.openCents)} · ${frasePrazo(client.dueDate)}`;

  return (
    <li className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
          className={`flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-lg text-left ${PRESS}`}
        >
          <span
            aria-hidden
            className={`size-3 shrink-0 rounded-full ${cor.ponto}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-neutral-900">
              {client.name}
            </span>
            <span className={`block text-base ${cor.texto}`}>{resumo}</span>
          </span>
          <span aria-hidden className="ml-auto text-neutral-400">
            {aberto ? "▴" : "▾"}
          </span>
        </button>

        {client.status !== "pago" ? (
          <form
            action={(f) => startTransition(() => markPaidAction(f))}
            className="flex items-center gap-2"
          >
            {client.items
              .filter((i) => i.openCents > 0)
              .map((i) => (
                <input key={i.cardId} type="hidden" name="card" value={i.cardId} />
              ))}
            <SeletorForma id={`forma-${client.id}`} />
            <button
              type="submit"
              disabled={pending}
              aria-label={`Recebi tudo de ${client.name}`}
              className={`rounded-lg bg-neutral-900 px-5 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
            >
              {pending ? "Salvando…" : "Recebi tudo"}
            </button>
          </form>
        ) : null}
      </div>

      {aberto ? (
        <div className="border-t border-neutral-100 px-4 pb-4">
          <ul className="divide-y divide-neutral-100">
            {client.items.map((item) => (
              <ItemLinha key={item.cardId} item={item} />
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center rounded-lg border border-neutral-300 px-4 text-base text-neutral-800 hover:bg-neutral-50 ${PRESS}`}
              >
                Cobrar no WhatsApp
              </a>
            ) : null}

            <form
              action="/admin/clientes/faturamento/pdf"
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="cliente" value={client.id} />
              <input type="hidden" name="mes" value={mes} />
              <select
                name="pagamento"
                aria-label="Conta para o cliente pagar"
                className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base"
              >
                {INVOICE_PAYMENT_PRESETS.map((p) => (
                  <option key={p.label} value={p.text}>
                    Conta {p.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className={`rounded-lg border border-neutral-300 px-4 text-base text-neutral-800 hover:bg-neutral-50 ${PRESS}`}
              >
                Baixar relatório (PDF)
              </button>
            </form>

            <Link
              href={`/admin/clientes/cadastro?abrir=${client.id}`}
              className={`ml-auto inline-flex items-center rounded-lg px-3 text-base text-neutral-600 underline hover:text-neutral-900 ${PRESS}`}
            >
              Dados do cliente
            </Link>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function DinheiroClientes({
  clients,
  mes,
  mesNome,
}: {
  clients: MoneyClient[];
  mes: string;
  mesNome: string;
}) {
  return (
    <ul className="space-y-3">
      {clients.map((client) => (
        <ClienteLinha
          key={client.id}
          client={client}
          mes={mes}
          mesNome={mesNome}
          aberto={clients.length <= 2}
        />
      ))}
    </ul>
  );
}
