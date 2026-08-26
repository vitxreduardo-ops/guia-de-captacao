"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  disconnectCalendarAction,
  syncMyCalendarAction,
} from "@/app/admin/agenda/actions";

/**
 * Conectar/desconectar a agenda pessoal.
 *
 * Cada ação fala com o Google e leva alguns segundos; sem dizer nada na tela
 * o clique parece não ter feito efeito e a pessoa clica de novo. Por isso
 * todo botão aqui tem estado de "trabalhando" e deixa um resultado escrito.
 *
 * Depois de conectada não há mais nada a decidir no dia a dia: o bloco de
 * conexão vira uma engrenagem ao lado dos controles da semana, e a grade
 * ganha o espaço que ele ocupava.
 */
export function CalendarConnection({
  connected,
  email,
  cardCount,
}: {
  /** Estado da conexão vem separado do e-mail de propósito: o e-mail é
   * enfeite e pode faltar (a API do Google pode não devolver), enquanto isso
   * aqui decide o que a tela mostra. Amarrar os dois já fez uma conta
   * conectada aparecer como desconectada. */
  connected: boolean;
  email: string | null;
  cardCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Clicar fora ou apertar Esc fecha — é um painel de ajustes, não um passo
  // do fluxo; prender a pessoa nele seria estranho.
  useEffect(() => {
    if (!open) return;
    // Ouvir "click" (e não "pointerdown"): o pointerdown que abre o painel
    // chega antes de o React processar o clique, e o painel se fechava no
    // mesmo gesto que o abriu.
    function handleClick(clickEvent: MouseEvent) {
      if (!boxRef.current?.contains(clickEvent.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") setOpen(false);
    }
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!connected) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-medium text-neutral-900">
          Conectar minha agenda
        </h2>
        <p className="mt-1 max-w-prose text-sm text-neutral-500">
          Todo material do backlog que tiver data vira um evento na sua agenda
          principal do Google. É só autorizar — nada mais pra configurar.
        </p>
        <a
          href="/api/calendar/oauth/start"
          className="mt-4 inline-block rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Conectar com o Google
        </a>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Ajustes da agenda"
        aria-expanded={open}
        title="Ajustes da agenda"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 ${
          open ? "bg-neutral-100 text-neutral-700" : ""
        }`.trim()}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={`h-4 w-4 ${pending ? "animate-spin" : ""}`.trim()}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.8 8.6a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.3a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z" />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Ajustes da agenda"
          className="absolute right-0 top-10 z-40 w-72 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg"
        >
          <h2 className="text-sm font-medium text-neutral-900">Minha agenda</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Conectada{email ? (
              <>
                {" "}em <span className="font-medium">{email}</span>
              </>
            ) : null}, na agenda principal. {cardCount}{" "}
            {cardCount === 1 ? "material" : "materiais"} com data{" "}
            {cardCount === 1 ? "está" : "estão"} sendo sincronizado
            {cardCount === 1 ? "" : "s"}.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setMessage(null);
                  const synced = await syncMyCalendarAction();
                  setMessage(
                    `${synced} ${synced === 1 ? "material sincronizado" : "materiais sincronizados"}.`
                  );
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {pending ? "Sincronizando..." : "Sincronizar agora"}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setMessage(null);
                  await disconnectCalendarAction();
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>

          {message ? (
            <p className="mt-2 text-sm text-neutral-500">{message}</p>
          ) : null}

          <p className="mt-3 text-xs text-neutral-400">
            Ao desconectar, os eventos criados por aqui são apagados da sua
            agenda.
          </p>
        </div>
      ) : null}
    </div>
  );
}
