"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

/**
 * Item do painel Atenção: o resumo é um botão e a lista completa abre num diálogo
 * com o fundo desfocado. <dialog> nativo: Esc fecha, o foco fica preso dentro e a
 * tela de trás não recebe toque. Clicar fora, no X ou num link também fecha.
 */
export function AtencaoDialog({
  titulo,
  descricao,
  resumo,
  children,
}: {
  titulo: string;
  descricao: string;
  resumo: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className="block w-full rounded-xl text-left transition-transform hover:opacity-80 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] pointer-coarse:min-h-11"
      >
        {resumo}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`atencao-${titulo}`}
        onClick={(e) => {
          // Clique no fundo (o próprio <dialog>) ou num link fecha; o link segue a navegação normal.
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest("a")) ref.current?.close();
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/30 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start gap-3 border-b border-neutral-100 p-5">
          <div className="min-w-0 flex-1">
            <h2 id={`atencao-${titulo}`} className="text-lg font-semibold">
              {titulo}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">{descricao}</p>
          </div>
          <form method="dialog">
            <button
              aria-label="Fechar"
              className="grid size-9 shrink-0 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none pointer-coarse:size-11"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </form>
        </div>
        <div className="max-h-[min(60vh,32rem)] overflow-y-auto p-5">{children}</div>
      </dialog>
    </>
  );
}
