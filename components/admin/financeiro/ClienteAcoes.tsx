"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Janela } from "@/components/admin/financeiro/Acoes";
import { BOTAO } from "@/components/admin/financeiro/ui";
import { formatBRL } from "@/lib/billingTypes";
import { CobrarLink, ContaSelect } from "@/components/admin/ContaPix";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/backlogTypes";
import type { PaymentMethod } from "@/lib/backlogTypes";
import type { MoneyItem } from "@/lib/dinheiroTypes";
import { diaPorExtenso, frasePrazo } from "@/lib/dinheiroTexto";
import {
  markPaidAction,
  markPartialAction,
  markUnpaidAction,
  setDueAction,
  updateClientContactAction,
  updateItemAction,
} from "@/app/admin/financeiro/actions";

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

export function ItemLinha({ item }: { item: MoneyItem }) {
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
            <span className="mb-1 block text-sm font-medium text-neutral-600">Nome da entrega</span>
            <input name="titulo" required defaultValue={item.title} autoFocus className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Quantidade</span>
            <input name="quantidade" type="number" min={1} required defaultValue={item.quantity} className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Valor de cada uma</span>
            <input name="valor" required inputMode="decimal" defaultValue={paraCampo(item.unitCents)} className={CAMPO} />
          </label>
          <label className="block sm:col-span-3">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Vence em</span>
            <input name="vencimento" type="date" defaultValue={item.dueCustom ? (item.dueOn ?? "") : ""} className={`${CAMPO} sm:w-56`} />
            <span className="mt-1 block text-sm text-neutral-600">
              Deixe vazio para seguir o dia combinado com o cliente
              {item.dueOn && !item.dueCustom ? ` (hoje: ${diaPorExtenso(item.dueOn)})` : ""}.
            </span>
          </label>
          <label className="block sm:col-span-3">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Produto ou serviço (opcional)</span>
            <input name="produto" defaultValue={item.serviceName ?? ""} placeholder="Ex.: Reel editado" className={CAMPO} />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
            <button type="submit" disabled={pending} className={`rounded-lg bg-(--tatu-ink) px-5 text-base font-medium text-white hover:bg-(--tatu-ink)/90 disabled:opacity-50 ${PRESS}`}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className={`rounded-lg px-3 text-base text-neutral-600 underline ${PRESS}`}>
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
            <p className="text-sm text-neutral-600">
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
            className={`rounded-lg bg-(--tatu-ink)/10 px-3 text-sm font-medium text-(--tatu-ink) hover:bg-(--tatu-ink)/15 disabled:opacity-50 ${PRESS}`}
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
              className={`rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 ${PRESS}`}
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
          <label className="text-base text-neutral-600" htmlFor={`parte-${item.cardId}`}>
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
            className={`rounded-lg bg-(--tatu-ink) px-4 text-base font-medium text-white hover:bg-(--tatu-ink)/90 disabled:opacity-50 ${PRESS}`}
          >
            Guardar
          </button>
        </form>
      ) : null}
    </li>
  );
}

export interface ClienteBasico {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  paymentDay: number | null;
}

/** Tudo que se faz com o dinheiro de um cliente, sem sair da página dele. */
export function ClienteAcoes({
  client,
  abertos,
  meses,
}: {
  client: ClienteBasico;
  /** Entregas com valor em aberto, de qualquer mês. */
  abertos: MoneyItem[];
  /** Meses com entregas, para escolher o do relatório em PDF. */
  meses: { key: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const openCents = abertos.reduce((s, i) => s + i.openCents, 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {abertos.length > 0 ? (
        <>
          <form action={(f) => startTransition(() => markPaidAction(f))} className="flex items-center gap-2">
            {abertos.map((i) => (
              <input key={i.cardId} type="hidden" name="card" value={i.cardId} />
            ))}
            <SeletorForma id={`forma-${client.id}`} />
            <button type="submit" disabled={pending} aria-label={`Recebi tudo de ${client.name}`} className={BOTAO.cheio}>
              {pending ? "Salvando…" : "Recebi tudo"}
            </button>
          </form>
          <CobrarLink
            cliente={client}
            mesNome="suas entregas em aberto"
            cents={openCents}
            rotulo="Cobrar no WhatsApp"
            className={BOTAO.contorno}
          />
          <Janela rotulo="Mudar vencimento" titulo="Mudar vencimento" variante="contorno">
            {(fechar) => (
              <form
                action={(f) =>
                  startTransition(async () => {
                    await setDueAction(f);
                    fechar();
                  })
                }
                className="grid gap-3"
              >
                {abertos.map((i) => (
                  <input key={i.cardId} type="hidden" name="card" value={i.cardId} />
                ))}
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-600">
                    Novo vencimento das {abertos.length} entregas em aberto
                  </span>
                  <input name="vencimento" type="date" className={`${CAMPO} sm:w-56`} />
                </label>
                <p className="text-sm text-neutral-600">Deixe a data vazia para voltar ao vencimento automático.</p>
                <button type="submit" disabled={pending} className={`${BOTAO.cheio} justify-self-start`}>
                  {pending ? "Salvando…" : "Aplicar"}
                </button>
              </form>
            )}
          </Janela>
        </>
      ) : null}

      <Janela rotulo="Contato e dia de pagamento" titulo="Contato e dia de pagamento" variante="contorno">
        {(fechar) => (
          <form
            action={(f) =>
              startTransition(async () => {
                await updateClientContactAction(f);
                fechar();
              })
            }
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="client" value={client.id} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Dia em que paga</span>
              <input name="dia" type="number" min={1} max={31} defaultValue={client.paymentDay ?? ""} placeholder="10" className={CAMPO} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Telefone (WhatsApp)</span>
              <input name="telefone" type="tel" inputMode="tel" defaultValue={client.phone ?? ""} placeholder="(00) 00000-0000" className={CAMPO} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Quem recebe a cobrança</span>
              <input name="responsavel" defaultValue={client.contactName ?? ""} className={CAMPO} />
            </label>
            <button type="submit" disabled={pending} className={`${BOTAO.cheio} justify-self-start`}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </form>
        )}
      </Janela>

      {meses.length > 0 ? (
        <form action="/admin/financeiro/faturamento/pdf" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="cliente" value={client.id} />
          <select name="mes" aria-label="Mês do relatório" className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base">
            {meses.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <ContaSelect name="pagamento" ariaLabel="Conta que recebe o Pix (vai na cobrança e no PDF)" />
          <button type="submit" className={BOTAO.contorno}>Baixar relatório (PDF)</button>
        </form>
      ) : null}

      <Link href={`/admin/financeiro/clientes?abrir=${client.id}`} className="ml-auto inline-flex min-h-11 items-center text-base text-neutral-600 underline hover:text-neutral-900">
        Todos os dados do cliente
      </Link>
    </div>
  );
}
