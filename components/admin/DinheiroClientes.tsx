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
  setDueAction,
  updateClientContactAction,
  updateItemAction,
} from "@/app/admin/clientes/dinheiro/actions";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const paraCampo = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

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
  const [editando, setEditando] = useState(false);
  const dados = () => {
    const f = new FormData();
    f.append("card", item.cardId);
    return f;
  };
  const entrou = item.receivedCents > 0 && !item.paid;

  if (editando) {
    return (
      <li className="py-3">
        <form
          action={(f) =>
            startTransition(async () => {
              await updateItemAction(f);
              setEditando(false);
            })
          }
          className="grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-[1fr_6rem_9rem]"
        >
          <input type="hidden" name="card" value={item.cardId} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Nome da entrega</span>
            <input name="titulo" required defaultValue={item.title} autoFocus className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Quantidade</span>
            <input name="quantidade" type="number" min={1} required defaultValue={item.quantity} className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Valor de cada uma</span>
            <input name="valor" required inputMode="decimal" defaultValue={paraCampo(item.unitCents)} className={CAMPO} />
          </label>
          <label className="block sm:col-span-3">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Vence em</span>
            <input name="vencimento" type="date" defaultValue={item.dueCustom ? (item.dueOn ?? "") : ""} className={`${CAMPO} sm:w-56`} />
            <span className="mt-1 block text-sm text-neutral-600">
              Deixe vazio para seguir o dia combinado com o cliente
              {item.dueOn && !item.dueCustom ? ` (hoje: ${diaPorExtenso(item.dueOn)})` : ""}.
            </span>
          </label>
          <label className="block sm:col-span-3">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Produto ou serviço (opcional)</span>
            <input name="produto" defaultValue={item.serviceName ?? ""} placeholder="Ex.: Reel editado" className={CAMPO} />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
            <button type="submit" disabled={pending} className={`rounded-lg bg-neutral-900 px-5 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className={`rounded-lg px-3 text-base text-neutral-700 underline ${PRESS}`}>
              Cancelar
            </button>
            <p className="text-sm text-neutral-600">Também muda no card do quadro de Entregas.</p>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-base text-neutral-900">{item.title || "Sem título"}</p>
          <p className="text-sm text-neutral-500">
            {item.serviceName ?? "Sem serviço"}
            {item.date ? ` · ${diaPorExtenso(item.date)}` : ""}
          </p>
          {!item.paid ? (
            <p className={`text-sm ${item.dueOn && item.dueOn < new Date().toLocaleDateString("sv-SE") ? "text-red-700" : "text-neutral-600"}`}>
              {frasePrazo(item.dueOn)}
              {item.dueCustom ? " (data escolhida)" : ""}
            </p>
          ) : null}
          {entrou ? (
            <p className="text-sm text-amber-700">
              Já entrou {formatBRL(item.receivedCents)} · falta {formatBRL(item.openCents)}
            </p>
          ) : null}
        </div>
        <span className="text-base font-medium text-neutral-900 tabular-nums">
          {formatBRL(item.totalCents)}
        </span>
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Editar ${item.title || "esta entrega"}`}
          className={`rounded-lg px-3 text-sm text-neutral-600 underline hover:text-neutral-900 ${PRESS}`}
        >
          Editar
        </button>
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
  const [contato, setContato] = useState(false);
  const [venc, setVenc] = useState(false);
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

            {client.status !== "pago" ? (
              <button
                type="button"
                onClick={() => setVenc(!venc)}
                aria-expanded={venc}
                className={`rounded-lg px-3 text-base text-neutral-700 underline hover:text-neutral-900 ${PRESS}`}
              >
                Mudar vencimento
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setContato(!contato)}
              aria-expanded={contato}
              className={`rounded-lg px-3 text-base text-neutral-700 underline hover:text-neutral-900 ${PRESS}`}
            >
              Editar contato e dia de pagamento
            </button>

            <Link
              href={`/admin/clientes/cadastro?abrir=${client.id}`}
              className={`ml-auto inline-flex items-center rounded-lg px-3 text-base text-neutral-600 underline hover:text-neutral-900 ${PRESS}`}
            >
              Todos os dados
            </Link>
          </div>

          {venc ? (
            <form
              action={(f) =>
                startTransition(async () => {
                  await setDueAction(f);
                  setVenc(false);
                })
              }
              className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-neutral-50 p-3"
            >
              {client.items
                .filter((i) => i.openCents > 0)
                .map((i) => (
                  <input key={i.cardId} type="hidden" name="card" value={i.cardId} />
                ))}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Novo vencimento das {client.items.filter((i) => i.openCents > 0).length} entregas em aberto
                </span>
                <input name="vencimento" type="date" className={`${CAMPO} sm:w-56`} />
              </label>
              <button type="submit" disabled={pending} className={`rounded-lg bg-neutral-900 px-5 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}>
                {pending ? "Salvando…" : "Aplicar"}
              </button>
              <p className="w-full text-sm text-neutral-600">
                Deixe a data vazia e toque em Aplicar para voltar ao vencimento automático.
              </p>
            </form>
          ) : null}

          {contato ? (
            <form
              action={(f) =>
                startTransition(async () => {
                  await updateClientContactAction(f);
                  setContato(false);
                })
              }
              className="mt-3 grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-3"
            >
              <input type="hidden" name="client" value={client.id} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">Dia em que paga</span>
                <input name="dia" type="number" min={1} max={31} defaultValue={client.paymentDay ?? ""} placeholder="10" className={CAMPO} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">Telefone (WhatsApp)</span>
                <input name="telefone" type="tel" inputMode="tel" defaultValue={client.phone ?? ""} placeholder="(00) 00000-0000" className={CAMPO} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">Quem recebe a cobrança</span>
                <input name="responsavel" defaultValue={client.contactName ?? ""} className={CAMPO} />
              </label>
              <div className="flex items-center gap-2 sm:col-span-3">
                <button type="submit" disabled={pending} className={`rounded-lg bg-neutral-900 px-5 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}>
                  {pending ? "Salvando…" : "Salvar"}
                </button>
                <button type="button" onClick={() => setContato(false)} className={`rounded-lg px-3 text-base text-neutral-700 underline ${PRESS}`}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}
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
