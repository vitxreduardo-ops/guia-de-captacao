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
      {open ? sidebar : null}

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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
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
