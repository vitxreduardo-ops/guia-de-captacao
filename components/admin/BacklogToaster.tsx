"use client";

import { useEffect, useState, useTransition } from "react";
import { answerBackupQuestionAction } from "@/app/admin/backlog/actions";

interface PendingQuestion {
  question: string;
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
  question: string,
  data: { cardId: string; cardTitle: string }
): void {
  const item = { question, ...data };
  if (notify) notify(item);
  else queued.push(item);
}

export function BacklogToaster() {
  const [queue, setQueue] = useState<PendingQuestion[]>([]);
  const [answer, setAnswer] = useState("");
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
    setQueue((rest) => rest.slice(1));
  }

  function submit() {
    const value = answer.trim();
    if (!value || !current) return;
    startTransition(async () => {
      await answerBackupQuestionAction(current.cardId, value);
      close();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.question}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30 p-4 backdrop-blur-sm duration-150 animate-in fade-in"
    >
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-4 shadow-xl duration-150 animate-in zoom-in-95">
        <p className="text-sm font-semibold text-neutral-900">
          {current.question}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {current.cardTitle}
        </p>

        <input
          value={answer}
          autoFocus
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ex: HD Samsung T7 / pasta 14Bis"
          disabled={pending}
          className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:opacity-50"
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
            onClick={submit}
            disabled={pending || !answer.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
