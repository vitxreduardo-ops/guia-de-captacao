"use client";

import { useSyncExternalStore, type ReactNode } from "react";

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
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // Sem escolha guardada, a lateral começa escondida no celular e no
      // tablet: aberta ali ela ocupa a tela inteira e a grade — que é o
      // motivo da página — só aparece depois de rolar.
      hidden = saved
        ? saved === "escondida"
        : !window.matchMedia("(min-width: 1024px)").matches;
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
  return (
    <div className="lg:flex lg:gap-6">
      {/* Colapso em CSS, não em JS: a lateral encolhe na altura enquanto
          fica acima da grade e na largura quando vira coluna, e o próprio
          breakpoint decide qual eixo — ler a largura da janela no cliente
          deixava a lateral com a medida do outro layout. */}
      <div
        // Escondida ela sai também do foco e do leitor de tela: sem isto o
        // Tab entrava num bloco de altura zero.
        inert={!open}
        className={`grid overflow-hidden transition-[grid-template-rows,width,opacity,margin] duration-300 ease-out motion-reduce:duration-100 lg:shrink-0 ${
          open
            ? "mb-5 grid-rows-[1fr] opacity-100 lg:mb-0 lg:w-56"
            : "mb-0 grid-rows-[0fr] opacity-0 lg:w-0"
        }`}
      >
        {/* O filho precisa poder encolher a zero pro `0fr` valer. */}
        <div className="min-h-0 overflow-hidden">{sidebar}</div>
      </div>

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
