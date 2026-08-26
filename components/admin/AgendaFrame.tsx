"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const STORAGE_KEY = "agenda:lateral";

/**
 * Estado da lateral, guardado fora do React.
 *
 * O servidor sempre renderiza a lateral aberta; ler o localStorage por
 * `useSyncExternalStore` deixa a hidratação bater com o HTML e só então
 * aplica a escolha guardada — sem o piscar de quem a deixou escondida.
 */
let hidden: boolean | null = null;
const listeners = new Set<() => void>();

function isHidden(): boolean {
  if (hidden === null) {
    try {
      hidden = window.localStorage.getItem(STORAGE_KEY) === "escondida";
    } catch {
      // Navegador com armazenamento bloqueado: segue com a lateral aberta.
      hidden = false;
    }
  }
  return hidden;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Largura da lateral aberta, em pixels — o mesmo `w-56` do conteúdo. */
const SIDEBAR_WIDTH = 224;

/**
 * A lateral colapsa na largura no desktop e na altura no celular, onde ela
 * fica acima da grade. Motion não enxerga breakpoint, então o layout é lido
 * aqui.
 */
function subscribeToWide(onChange: () => void) {
  const query = window.matchMedia("(min-width: 1024px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isWide(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function setHidden(next: boolean) {
  hidden = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "escondida" : "visivel");
  } catch {
    // Sem memória entre visitas, mas o clique continua valendo agora.
  }
  for (const listener of listeners) listener();
}

/**
 * Moldura da tela: lateral que se esconde, barra de controles e grade.
 *
 * A lateral e a barra são montadas no servidor e entram aqui como conteúdo
 * pronto; o que este componente acrescenta é o botão que mostra e esconde a
 * lateral, e a memória dessa escolha entre visitas — quem trabalha com a
 * grade aberta não quer reabrir o menu a cada semana.
 */
export function AgendaFrame({
  sidebar,
  toolbar,
  children,
}: {
  sidebar: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
}) {
  const open = !useSyncExternalStore(subscribe, isHidden, () => false);
  const wide = useSyncExternalStore(subscribeToWide, isWide, () => true);
  const prefersReducedMotion = useReducedMotion();

  // Fechada e aberta descrevem o mesmo caminho, só que ao contrário: a
  // lateral sai por onde entrou (§ caminho simétrico).
  const closed = wide
    ? { width: 0, opacity: 0 }
    : { height: 0, opacity: 0, marginBottom: 0 };
  const shown = wide
    ? { width: SIDEBAR_WIDTH, opacity: 1 }
    : { height: "auto" as const, opacity: 1, marginBottom: 20 };
  const transition = prefersReducedMotion
    ? { duration: 0.12 }
    : { type: "spring" as const, bounce: 0, duration: 0.3 };

  return (
    <div className="lg:flex lg:gap-6">
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="lateral"
            initial={closed}
            animate={shown}
            exit={closed}
            transition={transition}
            // Sem isto o conteúdo vaza enquanto a largura anima.
            className="overflow-hidden lg:shrink-0"
          >
            {sidebar}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setHidden(open)}
            aria-pressed={!open}
            aria-label={
              open ? "Esconder calendário e agendas" : "Mostrar calendário e agendas"
            }
            title={
              open ? "Esconder calendário e agendas" : "Mostrar calendário e agendas"
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-transform hover:bg-neutral-100 hover:text-neutral-700 active:scale-90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {toolbar}
        </div>

        {children}
      </div>
    </div>
  );
}
