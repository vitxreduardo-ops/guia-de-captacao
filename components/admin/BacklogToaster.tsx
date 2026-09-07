"use client";

import { useEffect, useState, useTransition } from "react";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type BacklogPrompt,
} from "@/lib/backlogTypes";
import {
  answerBackupQuestionAction,
  answerPaymentQuestionAction,
} from "@/app/admin/kanbanActions";

interface PendingQuestion {
  prompt: BacklogPrompt;
  cardId: string;
  cardTitle: string;
}

/**
 * Fila de perguntas fora do React: quem dispara a automação é o handler de
 * arraste do quadro, que não tem como chamar um hook. O componente montado se
 * inscreve aqui e mostra uma pergunta por vez.
 */
let notify: ((item: PendingQuestion) => void) | null = null;
const queued: PendingQuestion[] = [];

export function askBacklogQuestion(
  prompt: BacklogPrompt,
  data: { cardId: string; cardTitle: string }
): void {
  const item = { prompt, ...data };
  if (notify) notify(item);
  else queued.push(item);
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:opacity-50";
const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11";

/** "2026-09-07" no fuso local — `toISOString` volta um dia à noite no Brasil. */
function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

export function BacklogToaster() {
  const [queue, setQueue] = useState<PendingQuestion[]>([]);
  const [answer, setAnswer] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paidAt, setPaidAt] = useState(today);
  const [method, setMethod] = useState<string>("pix");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    notify = (item) => setQueue((current) => [...current, item]);
    // Perguntas disparadas antes deste componente montar ficam na fila do
    // módulo; entrega num microtask pra não chamar setState dentro do efeito.
    if (queued.length > 0) {
      const pendingItems = queued.splice(0);
      queueMicrotask(() =>
        setQueue((current) => [...current, ...pendingItems])
      );
    }
    return () => {
      notify = null;
    };
  }, []);

  const current = queue[0] ?? null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setQueue((rest) => rest.slice(1));
    }
    if (!current) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current]);

  if (!current) return null;

  function close() {
    setAnswer("");
    setConfirmingPayment(false);
    setPaidAt(today());
    setMethod("pix");
    setQueue((rest) => rest.slice(1));
  }

  function submitText() {
    const value = answer.trim();
    if (!value || !current) return;
    startTransition(async () => {
      await answerBackupQuestionAction(current.cardId, value);
      close();
    });
  }

  function answerPayment(paid: boolean) {
    if (!current || current.prompt.kind !== "payment") return;
    const { waitingColumnId } = current.prompt;
    const card = current;
    startTransition(async () => {
      await answerPaymentQuestionAction({
        cardId: card.cardId,
        paid,
        waitingColumnId,
        paidAt: paid ? paidAt : null,
        paymentMethod: paid ? method : null,
      });
      close();
    });
  }

  const isPayment = current.prompt.kind === "payment";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.prompt.question}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30 p-4 backdrop-blur-sm duration-150 animate-in fade-in"
    >
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-4 shadow-xl duration-150 animate-in zoom-in-95">
        <p className="text-sm font-semibold text-neutral-900">
          {current.prompt.question}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {current.cardTitle}
        </p>

        {isPayment ? (
          confirmingPayment ? (
            // Data e forma são perguntadas no instante em que a pessoa confirma
            // o recebimento: depois disso, ela teria que abrir o card de novo.
            <>
              <div className="mt-3 grid gap-2">
                <label className="text-xs font-medium text-neutral-600">
                  Data do pagamento
                  <input
                    type="date"
                    value={paidAt}
                    onChange={(event) => setPaidAt(event.target.value)}
                    disabled={pending}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
                <label className="text-xs font-medium text-neutral-600">
                  Forma
                  <select
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    disabled={pending}
                    className={`mt-1 ${inputClass}`}
                  >
                    {PAYMENT_METHODS.map((option) => (
                      <option key={option} value={option}>
                        {PAYMENT_METHOD_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                >
                  Agora não
                </button>
                <button
                  type="button"
                  onClick={() => answerPayment(true)}
                  disabled={pending}
                  className={`rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
                >
                  {pending ? "Salvando..." : "Confirmar pagamento"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => answerPayment(false)}
                disabled={pending}
                className={`flex-1 rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 ${PRESS}`}
              >
                Ainda não
              </button>
              <button
                type="button"
                onClick={() => setConfirmingPayment(true)}
                disabled={pending}
                autoFocus
                className={`flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
              >
                Já foi pago
              </button>
              <p className="w-full text-xs text-neutral-500">
                &quot;Ainda não&quot; devolve a entrega para Aguardando
                pagamento. Ela continua na nota do mês.
              </p>
            </div>
          )
        ) : (
          <>
            <input
              value={answer}
              autoFocus
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitText();
                }
              }}
              placeholder="Ex: HD Samsung T7 / pasta 14Bis"
              disabled={pending}
              className={`mt-3 ${inputClass}`}
            />

            <div className="mt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={submitText}
                disabled={pending || !answer.trim()}
                className={`rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
              >
                {pending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
