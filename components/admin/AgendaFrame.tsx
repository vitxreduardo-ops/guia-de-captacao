"use client";

import { useState, type ReactNode } from "react";

/**
 * Moldura da tela: lateral que se esconde, barra de controles e grade.
 *
 * A lateral e a barra são montadas no servidor e entram aqui como conteúdo
 * pronto; o que este componente acrescenta é o botão que mostra e esconde a
 * lateral.
 *
 * A lateral nasce fechada toda vez que a página abre, e a escolha não
 * sobrevive à visita — a grade é o motivo da tela, e quem quiser o
 * calendário e a lista de agendas pede. Trocar as semanas no ‹ › não conta
 * como abrir de novo: aquilo troca a query, não remonta este componente,
 * então a lateral aberta continua aberta enquanto a pessoa navega o período.
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
  // Fechada no primeiro render tanto no servidor quanto no cliente: sem
  // estado externo pra ler, não há divergência de hidratação nem piscada.
  const [open, setOpen] = useState(false);
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
            onClick={() => setOpen((current) => !current)}
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
