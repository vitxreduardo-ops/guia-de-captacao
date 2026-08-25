"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

const DEFAULT_INTERVAL_MS = 10_000;

// Elementos onde o usuário está digitando: revalidar por baixo enquanto isso
// acontece só atrapalha, então o ciclo espera o campo perder o foco.
const TYPING_SELECTOR = "input, textarea, select, [contenteditable='true']";

function isBusy() {
  if (document.visibilityState !== "visible") return true;
  // Qualquer modal aberto (drawer de tarefa, de card, confirmações) conta como
  // interação em curso — todos passam pelo DialogContent de components/ui.
  if (
    document.querySelector("[data-live-pause], [data-slot='dialog-content']")
  ) {
    return true;
  }

  const active = document.activeElement;
  return active instanceof HTMLElement && active.matches(TYPING_SELECTOR);
}

/**
 * Mantém a página em dia com o que os outros usuários fizeram, sem F5.
 *
 * As telas do admin são `force-dynamic` e o servidor é a fonte da verdade, então
 * basta pedir uma revalidação de rota de tempos em tempos: o React reconcilia as
 * props novas por cima do estado local (ver `Board.tsx` e `DailyTodoList.tsx`).
 *
 * Componentes que estejam no meio de uma interação (arraste, drawer aberto)
 * marcam um elemento com `data-live-pause` para segurar o ciclo.
 */
export function LiveRefresh({
  intervalMs = DEFAULT_INTERVAL_MS,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // O ciclo não deve reiniciar a cada transição, então a flag chega no efeito
  // por ref em vez de virar dependência.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    let lastRefresh = 0;

    function refresh() {
      // Em rede lenta uma revalidação pode passar do intervalo; não empilha.
      if (pendingRef.current) return;
      lastRefresh = Date.now();
      startTransition(() => router.refresh());
    }

    function tick() {
      if (isBusy()) return;
      refresh();
    }

    // Voltar pra aba deve mostrar dados atuais na hora, sem esperar o ciclo.
    // `focus` e `visibilitychange` disparam juntos ao alternar de janela — a
    // janela de 1s abaixo evita a revalidação dobrada.
    function refreshOnReturn() {
      if (isBusy()) return;
      if (Date.now() - lastRefresh < 1000) return;
      refresh();
    }

    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("focus", refreshOnReturn);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("focus", refreshOnReturn);
    };
  }, [intervalMs, router]);

  return null;
}
