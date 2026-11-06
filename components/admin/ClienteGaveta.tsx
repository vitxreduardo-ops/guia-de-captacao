"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { formatBRL, monthLabel } from "@/lib/billingTypes";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/backlogTypes";
import type { PaymentMethod } from "@/lib/backlogTypes";
import { frasePrazo } from "@/lib/dinheiroTexto";
import { Extrato } from "@/components/admin/Extrato";
import { CobrarLink, ContaSelect } from "@/components/admin/ContaPix";
import {
  loadClientDrawerAction,
  markPaidAction,
  type ClientDrawerData,
} from "@/app/admin/clientes/dinheiro/actions";

const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] min-h-11";
const CAMPO =
  "min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const hoje = () => new Date().toLocaleDateString("sv-SE");

const Ctx = createContext<(clientId: string, trigger: HTMLElement | null) => void>(() => {});

/**
 * Gaveta lateral do cliente: tudo que ele deve, o que já pagou (editável) e o
 * caminho pra página completa, sem sair da tela de onde se clicou. Um `<dialog>`
 * modal dá de graça o foco preso e o Esc.
 */
export function ClienteGavetaProvider({ children }: { children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const origem = useRef<HTMLElement | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<ClientDrawerData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (clientId: string) => {
    try {
      setData(await loadClientDrawerAction(clientId));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para abrir o cliente.");
    }
  }, []);

  const abrir = useCallback(
    (clientId: string, trigger: HTMLElement | null) => {
      origem.current = trigger;
      setData(null);
      setErro(null);
      setId(clientId);
      dialog.current?.showModal();
      void carregar(clientId);
    },
    [carregar]
  );

  const fechar = () => dialog.current?.close();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => {
      setId(null);
      origem.current?.focus();
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  return (
    <Ctx.Provider value={abrir}>
      {children}
      <dialog
        ref={dialog}
        aria-label="Detalhes do cliente"
        onClick={(e) => {
          if (e.target === dialog.current) fechar();
        }}
        className="fixed top-0 right-0 bottom-0 left-auto m-0 h-dvh max-h-none w-[min(34rem,100%)] max-w-none overflow-y-auto border-l border-neutral-200 bg-white p-0 shadow-2xl backdrop:bg-neutral-900/30"
      >
        {id ? (
          <Conteudo data={data} erro={erro} onClose={fechar} onChanged={() => void carregar(id)} />
        ) : null}
      </dialog>
    </Ctx.Provider>
  );
}

/** Botão que abre a gaveta do cliente. */
export function AbrirCliente({
  clientId,
  className,
  children,
  ariaLabel,
}: {
  clientId: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const abrir = useContext(Ctx);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => abrir(clientId, e.currentTarget)}
      className={className}
    >
      {children}
    </button>
  );
}

function Numero({ rotulo, cents, tom }: { rotulo: string; cents: number; tom: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3.5 py-3">
      <p className="text-sm text-neutral-600">{rotulo}</p>
      <p className={`text-xl font-semibold tabular-nums ${tom}`}>{formatBRL(cents)}</p>
    </div>
  );
}

function Recebi({ cardId, onDone }: { cardId: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <form
      action={(f) =>
        startTransition(async () => {
          try {
            await markPaidAction(f);
            onDone();
          } catch (e) {
            setErro(e instanceof Error ? e.message : "Não deu para salvar.");
          }
        })
      }
      className="mt-2 flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="card" value={cardId} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Entrou em</span>
        <input name="pago_em" type="date" required defaultValue={hoje()} max={hoje()} className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Como</span>
        <select name="method" defaultValue="pix" className={CAMPO}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m as PaymentMethod]}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg bg-neutral-900 px-4 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
      >
        {pending ? "Salvando…" : "Recebi"}
      </button>
      {erro ? <p role="alert" className="w-full text-sm text-red-700">{erro}</p> : null}
    </form>
  );
}

function Conteudo({
  data,
  erro,
  onClose,
  onChanged,
}: {
  data: ClientDrawerData | null;
  erro: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [recebendo, setRecebendo] = useState<string | null>(null);

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-neutral-200 bg-white px-6 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-neutral-900">{data?.name ?? "Carregando…"}</h2>
          {data ? (
            <p className="text-base text-neutral-600">
              {data.companyName ? `${data.companyName} · ` : ""}
              {data.paymentDay ? `paga todo dia ${data.paymentDay}` : "sem dia combinado"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={`grid size-11 place-items-center rounded-lg bg-neutral-100 text-xl hover:bg-neutral-200 ${PRESS}`}
        >
          ×
        </button>
      </div>

      {erro ? (
        <p role="alert" className="m-6 rounded-lg bg-red-50 p-4 text-base text-red-800">{erro}</p>
      ) : !data ? (
        <div className="space-y-3 p-6" aria-busy="true">
          <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
          <div className="h-32 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      ) : (
        <GavetaCorpo data={data} recebendo={recebendo} setRecebendo={setRecebendo} onChanged={onChanged} />
      )}
    </div>
  );
}

function GavetaCorpo({
  data,
  recebendo,
  setRecebendo,
  onChanged,
}: {
  data: ClientDrawerData;
  recebendo: string | null;
  setRecebendo: (id: string | null) => void;
  onChanged: () => void;
}) {
  const recebido = data.months.reduce((s, m) => s + m.receivedCents, 0);
  const aberto = data.months.reduce((s, m) => s + m.openCents, 0);
  const atrasado = data.months.reduce((s, m) => s + m.overdueCents, 0);

  return (
    <div className="flex-1 px-6 pb-8">
      <div className="grid grid-cols-3 gap-3 py-5">
        <Numero rotulo="Já recebido" cents={recebido} tom="text-emerald-700" />
        <Numero rotulo="Falta receber" cents={aberto} tom={aberto ? "text-amber-700" : "text-neutral-500"} />
        <Numero rotulo="Atrasado" cents={atrasado} tom={atrasado ? "text-red-700" : "text-neutral-500"} />
      </div>

      {data.open.length > 0 ? (
        <section aria-labelledby="g-aberto" className="mb-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 id="g-aberto" className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">Em aberto</h3>
            <div className="flex flex-wrap items-center gap-2">
              <ContaSelect id={`g-conta-${data.id}`} ariaLabel="Conta que recebe o Pix" />
              <CobrarLink
                cliente={{ name: data.name, contactName: data.contactName, phone: data.phone }}
                mesNome="os meses em aberto"
                cents={aberto}
                rotulo="Cobrar"
                className={`inline-flex items-center rounded-lg border border-neutral-300 px-4 text-base font-medium hover:bg-neutral-50 ${PRESS}`}
              />
            </div>
          </div>
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {data.open.map((item) => {
              const atrasada = item.dueOn !== null && item.dueOn < hoje();
              return (
                <li key={item.cardId} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-base text-neutral-900">{item.title || "Sem título"}</p>
                      <p className={`text-sm ${atrasada ? "text-red-700" : "text-neutral-500"}`}>
                        trabalho de {monthLabel(item.month)} · {frasePrazo(item.dueOn)}
                        {item.receivedCents > 0 ? ` · já entrou ${formatBRL(item.receivedCents)}` : ""}
                      </p>
                    </div>
                    <span className="text-base font-medium tabular-nums">{formatBRL(item.openCents)}</span>
                    <button
                      type="button"
                      aria-expanded={recebendo === item.cardId}
                      onClick={() => setRecebendo(recebendo === item.cardId ? null : item.cardId)}
                      className={`rounded-lg border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50 ${PRESS}`}
                    >
                      Recebi
                    </button>
                  </div>
                  {recebendo === item.cardId ? (
                    <Recebi
                      cardId={item.cardId}
                      onDone={() => {
                        setRecebendo(null);
                        onChanged();
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="g-pagos" className="mb-6">
        <h3 id="g-pagos" className="mb-2 text-sm font-semibold tracking-wide text-neutral-500 uppercase">Pagamentos</h3>
        {data.statement.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-center text-base text-neutral-600">
            Nenhum pagamento registrado ainda.
          </p>
        ) : (
          <Extrato rows={data.statement} mes={null} plano onChanged={onChanged} />
        )}
        <p className="mt-2 text-sm text-neutral-500">
          Editar mexe só no pagamento. O vencimento combinado fica no cadastro.
        </p>
      </section>

      <Link
        href={`/admin/clientes/${data.id}`}
        className={`inline-flex items-center rounded-lg border border-neutral-300 px-4 text-base font-medium hover:bg-neutral-50 ${PRESS}`}
      >
        Abrir página completa do cliente
      </Link>
    </div>
  );
}
