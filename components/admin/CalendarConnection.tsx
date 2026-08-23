"use client";

import { useState, useTransition } from "react";
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
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-sm font-medium text-neutral-900">Minha agenda</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Conectada{email ? (
          <>
            {" "}em <span className="font-medium">{email}</span>
          </>
        ) : null}, na agenda principal. {cardCount} {cardCount === 1 ? "material" : "materiais"} com
        data {cardCount === 1 ? "está" : "estão"} sendo sincronizado
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

        {message ? (
          <span className="text-sm text-neutral-500">{message}</span>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        Ao desconectar, os eventos criados por aqui são apagados da sua agenda.
      </p>
    </div>
  );
}
