"use client";

import { Bell, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  detectState,
  enablePush,
  type PushState,
} from "@/components/admin/PushToggle";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

const DISMISSED_KEY = "onboarding-celular-dispensado";

type Step = "install" | "notify" | null;

/**
 * Onde parar. Só no celular: no computador o botão do sino já basta.
 * No iPhone pelo Safari o primeiro passo é instalar, porque sem isso o iOS
 * nem oferece push; aberto pelo ícone (ou no Android), é ativar.
 */
async function detectStep(): Promise<Step> {
  if (!window.matchMedia("(pointer: coarse)").matches) return null;
  try {
    if (localStorage.getItem(DISMISSED_KEY)) return null;
  } catch {
    // Sem storage (aba privada): mostra mesmo, no pior caso aparece de novo.
  }
  const state: PushState = await detectState();
  if (state === "iphone-browser") return "install";
  if (state === "off" && Notification.permission === "default") return "notify";
  return null;
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {}
}

/**
 * Passo a passo da primeira vez no celular: instalar na Tela de Início e
 * permitir notificações. Some de vez ao concluir ou ao tocar em "Agora não" —
 * quem desistir ainda tem o botão no sino.
 *
 * O storage do app instalado no iPhone é separado do Safari, então dispensar
 * a instrução de instalar não esconde o passo de notificações lá dentro.
 */
export function MobileOnboarding() {
  const [step, setStep] = useState<Step>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    detectStep().then(setStep);
  }, []);

  if (!step) return null;

  function close() {
    dismiss();
    setStep(null);
  }

  async function activate() {
    setBusy(true);
    try {
      await enablePush();
    } finally {
      setBusy(false);
      close();
    }
  }

  return (
    <div
      role="dialog"
      aria-labelledby="onboarding-titulo"
      className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg lg:hidden"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Fechar"
        className={`absolute top-2 right-2 flex size-11 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-900 ${FOCUS_RING}`}
      >
        <X aria-hidden="true" className="size-4" />
      </button>

      {step === "install" ? (
        <>
          <h2
            id="onboarding-titulo"
            className="pr-10 text-base font-semibold text-neutral-900"
          >
            Receba os avisos no iPhone
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Instale o painel na Tela de Início. Leva 10 segundos.
          </p>
          <ol className="mt-3 space-y-2.5 text-sm text-neutral-700">
            <li className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">
                1
              </span>
              <span>
                Toque em{" "}
                <Share
                  aria-label="Compartilhar"
                  className="inline size-4 align-[-2px]"
                />{" "}
                na barra do Safari
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">
                2
              </span>
              <span>
                Escolha{" "}
                <SquarePlus
                  aria-hidden="true"
                  className="inline size-4 align-[-2px]"
                />{" "}
                <strong className="font-medium">
                  Adicionar à Tela de Início
                </strong>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">
                3
              </span>
              <span>Abra o painel pelo ícone novo e entre de novo</span>
            </li>
          </ol>
          <button
            type="button"
            onClick={close}
            className={`mt-4 min-h-11 w-full rounded-md border border-neutral-300 text-sm text-neutral-600 active:scale-[0.97] ${FOCUS_RING}`}
          >
            Agora não
          </button>
        </>
      ) : (
        <>
          <h2
            id="onboarding-titulo"
            className="flex items-center gap-2 pr-10 text-base font-semibold text-neutral-900"
          >
            <Bell aria-hidden="true" className="size-4" />
            Ative as notificações
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Avisamos quando um card ou uma tarefa for passada pra você. Depois
            dá pra desligar pelo sino.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={close}
              className={`min-h-11 flex-1 rounded-md border border-neutral-300 text-sm text-neutral-600 active:scale-[0.97] ${FOCUS_RING}`}
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={activate}
              disabled={busy}
              className={`min-h-11 flex-1 rounded-md bg-neutral-900 text-sm font-medium text-white active:scale-[0.97] disabled:opacity-50 ${FOCUS_RING}`}
            >
              Ativar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
