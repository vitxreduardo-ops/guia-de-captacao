"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { unsubscribePushAction } from "@/app/admin/notificacoes/actions";
import { detectState, enablePush, type PushState } from "@/components/admin/PushToggle";

/**
 * Convite pra receber avisos no celular. No iPhone o iOS só entrega push para
 * o portal aberto pela Tela de Início; no Safari comum a API nem existe, e o
 * que aparece é o passo a passo.
 */
export function PushPrompt() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    detectState().then(setState);
  }, []);

  if (state === "loading" || state === "unsupported") return null;

  if (state === "on") {
    return (
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-[var(--tatu-muted)]">
        <Bell className="size-4" aria-hidden /> Avisos ativados neste aparelho.
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
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
          }}
          className="min-h-11 underline underline-offset-4"
        >
          Desativar
        </button>
      </p>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4" aria-labelledby="avisos">
      <h2 id="avisos" className="flex items-center gap-2 font-semibold">
        {state === "denied" ? <BellOff className="size-5" aria-hidden /> : <Bell className="size-5" aria-hidden />}
        Receba avisos no celular
      </h2>
      {state === "iphone-browser" ? (
        <p className="mt-1 text-sm text-[var(--tatu-muted)]">
          No iPhone, toque em <strong>Compartilhar</strong> e em <strong>Adicionar à Tela de Início</strong>. Depois,
          abra o portal pelo novo ícone e ative os avisos aqui.
        </p>
      ) : state === "denied" ? (
        <p className="mt-1 text-sm text-[var(--tatu-muted)]">
          As notificações estão bloqueadas nos ajustes deste aparelho. Libere-as para o portal e volte aqui.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-[var(--tatu-muted)]">
            Fique sabendo quando houver material para aprovar, roteiro publicado, nova ideia ou postagem no dia seguinte.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setState(await enablePush());
              } finally {
                setBusy(false);
              }
            }}
            className="mt-3 min-h-11 rounded-full bg-[var(--tatu-ink)] px-5 text-sm font-semibold text-[var(--tatu-cream)] disabled:opacity-60"
          >
            {busy ? "Ativando…" : "Ativar avisos"}
          </button>
        </>
      )}
    </section>
  );
}
