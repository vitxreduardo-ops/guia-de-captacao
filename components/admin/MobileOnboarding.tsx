"use client";

import { Bell, Share, SquarePlus, Smartphone, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  detectState,
  enablePush,
  type PushState,
} from "@/components/admin/PushToggle";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

const DISMISSED_KEY = "onboarding-celular-dispensado";

type Flow = "install" | "notify" | null;

/**
 * Onde parar. Só no celular: no computador o botão do sino já basta.
 * No iPhone pelo Safari o primeiro passo é instalar, porque sem isso o iOS
 * nem oferece push; aberto pelo ícone (ou no Android), é ativar.
 */
async function detectFlow(): Promise<Flow> {
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

/** Uma tela por passo: ícone grande e uma frase só, fácil de seguir no Safari. */
const INSTALL_PAGES: { icon: ReactNode; title: string; text: ReactNode }[] = [
  {
    icon: <Share aria-hidden="true" className="size-7" />,
    title: "Toque em Compartilhar",
    text: "É o quadrado com a seta pra cima, na barra do Safari.",
  },
  {
    icon: <SquarePlus aria-hidden="true" className="size-7" />,
    title: "Adicionar à Tela de Início",
    text: "Role a lista que abrir até achar essa opção e confirme em Adicionar.",
  },
  {
    icon: <Smartphone aria-hidden="true" className="size-7" />,
    title: "Abra pelo ícone novo",
    text: "Feche o Safari, abra o painel pelo ícone na Tela de Início e entre de novo. Lá você ativa as notificações.",
  },
];

/**
 * Passo a passo da primeira vez no celular: instalar na Tela de Início e
 * permitir notificações. Some de vez ao concluir ou ao tocar em "Agora não" —
 * quem desistir ainda tem o botão no sino.
 *
 * O storage do app instalado no iPhone é separado do Safari, então dispensar
 * a instrução de instalar não esconde o passo de notificações lá dentro.
 */
export function MobileOnboarding() {
  const [flow, setFlow] = useState<Flow>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    detectFlow().then(setFlow);
  }, []);

  if (!flow) return null;

  function close() {
    dismiss();
    setFlow(null);
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

  const current = INSTALL_PAGES[page];
  const isLast = page === INSTALL_PAGES.length - 1;

  return (
    // Centralizado com fundo escurecido: é a primeira coisa a fazer no
    // celular, e no rodapé passava por aviso qualquer.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 lg:hidden">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-titulo"
        className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 text-center shadow-lg"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className={`absolute top-2 right-2 flex size-11 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-900 ${FOCUS_RING}`}
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        {flow === "install" ? (
          <>
            <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Passo {page + 1} de {INSTALL_PAGES.length}
            </p>
            <div className="mx-auto mt-4 flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-900">
              {current.icon}
            </div>
            <h2
              id="onboarding-titulo"
              className="mt-3 text-lg font-semibold text-neutral-900"
            >
              {current.title}
            </h2>
            <p className="mt-1 min-h-[4lh] text-sm text-neutral-500">
              {current.text}
            </p>

            <div
              aria-hidden="true"
              className="mt-3 flex justify-center gap-1.5"
            >
              {INSTALL_PAGES.map((_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full ${
                    i === page ? "bg-neutral-900" : "bg-neutral-300"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              {/* No primeiro passo não há pra onde voltar: o lugar do Voltar
                  vira a saída. */}
              <button
                type="button"
                onClick={page === 0 ? close : () => setPage(page - 1)}
                className={`min-h-11 flex-1 rounded-md border border-neutral-300 text-sm text-neutral-600 active:scale-[0.97] ${FOCUS_RING}`}
              >
                {page === 0 ? "Agora não" : "Voltar"}
              </button>
              <button
                type="button"
                onClick={isLast ? close : () => setPage(page + 1)}
                className={`min-h-11 flex-1 rounded-md bg-neutral-900 text-sm font-medium text-white active:scale-[0.97] ${FOCUS_RING}`}
              >
                {isLast ? "Entendi" : "Próximo"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-900">
              <Bell aria-hidden="true" className="size-7" />
            </div>
            <h2
              id="onboarding-titulo"
              className="mt-3 text-lg font-semibold text-neutral-900"
            >
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
    </div>
  );
}
