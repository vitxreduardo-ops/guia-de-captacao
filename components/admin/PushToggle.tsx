"use client";

import { useEffect, useState } from "react";
import {
  subscribePushAction,
  unsubscribePushAction,
} from "@/app/admin/notificacoes/actions";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

export type PushState =
  | "loading"
  | "iphone-browser"
  | "unsupported"
  | "denied"
  | "off"
  | "on";
type State = PushState;

/** A chave VAPID pública vem em base64url; o navegador quer os bytes. */
function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/**
 * Pede a permissão e inscreve este aparelho. Tem que ser chamado dentro de um
 * clique: o iOS recusa pedir permissão sem gesto.
 */
export async function enablePush(): Promise<State> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "off";
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  await subscribePushAction(JSON.parse(JSON.stringify(sub)));
  return "on";
}

export async function detectState(): Promise<State> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return /iPhone|iPad|iPod/.test(navigator.userAgent)
      ? "iphone-browser"
      : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    return (await reg.pushManager.getSubscription()) ? "on" : "off";
  } catch {
    return "unsupported";
  }
}

/**
 * Liga o push deste aparelho. Cada aparelho se inscreve sozinho — ativar no
 * computador não ativa no iPhone. No iPhone só funciona com o painel aberto
 * pela Tela de Início; no Safari comum o iOS nem expõe a API, e aí o que
 * aparece é a instrução pra instalar.
 */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    detectState().then(setState);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      setState(await enablePush());
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-500">
      {state === "iphone-browser" ? (
        <p>
          Pra receber no iPhone: no Safari, toque em Compartilhar e em
          “Adicionar à Tela de Início”, e abra o painel pelo ícone.
        </p>
      ) : state === "denied" ? (
        <p>Notificações bloqueadas nos ajustes deste aparelho.</p>
      ) : (
        <button
          type="button"
          onClick={state === "on" ? disable : enable}
          disabled={busy}
          className={`rounded px-1 hover:text-neutral-900 disabled:opacity-50 ${FOCUS_RING}`}
        >
          {state === "on"
            ? "Desativar notificações neste aparelho"
            : "Ativar notificações neste aparelho"}
        </button>
      )}
    </div>
  );
}
