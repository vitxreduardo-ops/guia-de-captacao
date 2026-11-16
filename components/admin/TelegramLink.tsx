"use client";

import { useEffect, useState } from "react";
import {
  connectTelegramAction,
  disconnectTelegramAction,
  getTelegramStatusAction,
} from "@/app/admin/notificacoes/actions";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * Liga o Telegram da pessoa ao Tatu Agent. Um toque gera o link com o código
 * e abre o bot; no Telegram, "Iniciar" já conclui. Sem copiar código.
 */
export function TelegramLink() {
  const [status, setStatus] = useState<{ linked: string | null; enabled: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    getTelegramStatusAction().then(setStatus);
  }, []);

  if (!status?.enabled) return null;

  async function connect() {
    // Aberta antes do await: depois dele o navegador trata como popup e bloqueia.
    const tab = window.open("", "_blank");
    setBusy(true);
    try {
      const url = await connectTelegramAction();
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setWaiting(true);
    } catch {
      tab?.close();
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectTelegramAction();
      setStatus({ ...status!, linked: null });
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setStatus(await getTelegramStatusAction());
    setWaiting(false);
  }

  return (
    <div className="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-500">
      {status.linked ? (
        <p className="flex items-center justify-between gap-2">
          <span>Telegram conectado{status.linked !== "sem @" ? ` (@${status.linked})` : ""}</span>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className={`rounded px-1 hover:text-neutral-900 disabled:opacity-50 ${FOCUS_RING}`}
          >
            Desconectar
          </button>
        </p>
      ) : waiting ? (
        <p className="flex items-center justify-between gap-2">
          <span>No Telegram, toque em Iniciar.</span>
          <button
            type="button"
            onClick={refresh}
            className={`rounded px-1 hover:text-neutral-900 ${FOCUS_RING}`}
          >
            Já toquei
          </button>
        </p>
      ) : (
        <button
          type="button"
          onClick={connect}
          disabled={busy}
          className={`rounded px-1 hover:text-neutral-900 disabled:opacity-50 ${FOCUS_RING}`}
        >
          Conectar Telegram
        </button>
      )}
    </div>
  );
}
