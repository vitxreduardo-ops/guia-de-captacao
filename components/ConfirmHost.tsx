"use client";

import { useEffect, useRef, useState } from "react";

type Pedido = { mensagem: string; rotulo: string; resolver: (ok: boolean) => void };

let abrir: ((p: Pedido) => void) | null = null;

/**
 * Pergunta "tem certeza?" dentro da própria tela. Substitui o window.confirm,
 * que não aparece no app do Mac (WebView) e destoa do sistema no navegador.
 * Precisa do <ConfirmHost /> montado; sem ele, cai no confirm nativo.
 */
export function confirmar(mensagem: string, rotulo = "Confirmar"): Promise<boolean> {
  return new Promise((resolver) => {
    if (!abrir) return resolver(window.confirm(mensagem));
    abrir({ mensagem, rotulo, resolver });
  });
}

export function ConfirmHost() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const atual = useRef<Pedido | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    abrir = (p) => {
      atual.current?.resolver(false);
      atual.current = p;
      setPedido(p);
    };
    return () => {
      abrir = null;
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (pedido && !d.open) d.showModal();
    if (!pedido && d.open) d.close();
  }, [pedido]);

  function responder(ok: boolean) {
    atual.current?.resolver(ok);
    atual.current = null;
    setPedido(null);
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Confirmação"
      onCancel={(e) => {
        e.preventDefault();
        responder(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) responder(false);
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-900/40"
    >
      {pedido ? (
        <div className="p-5">
          <p className="text-base whitespace-pre-line">{pedido.mensagem}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => responder(false)}
              className="inline-flex min-h-11 items-center rounded-lg border border-neutral-300 px-4 text-base hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => responder(true)}
              className="inline-flex min-h-11 items-center rounded-lg bg-neutral-900 px-4 text-base text-white hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
            >
              {pedido.rotulo}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
