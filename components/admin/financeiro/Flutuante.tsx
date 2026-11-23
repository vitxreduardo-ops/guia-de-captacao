"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * Cartão que acompanha o mouse sobre um gráfico (o mesmo do antigo "Entrou e
 * saiu"): fica ao lado do ponteiro e vira para o outro lado quando falta
 * espaço, para nunca cobrir o que se quer ler.
 */
export function useCartaoFlutuante() {
  const ref = useRef<HTMLDivElement>(null);
  const [lugar, setLugar] = useState<{ left: number; top: number } | null>(null);
  const posicionar = (x: number, y: number) => {
    const w = ref.current?.offsetWidth ?? 256;
    const h = ref.current?.offsetHeight ?? 200;
    const gap = 18;
    const margem = 8;
    let left = x + gap;
    if (left + w > window.innerWidth - margem) left = x - gap - w;
    let top = y + gap;
    if (top + h > window.innerHeight - margem) top = y - gap - h;
    setLugar({ left: Math.max(margem, left), top: Math.max(margem, top) });
  };
  return { ref, lugar, posicionar, limpar: () => setLugar(null) };
}

/** Só em telas largas; no celular o conteúdo aparece embaixo do gráfico. */
export function CartaoFlutuante({
  cartaoRef,
  lugar,
  children,
}: {
  cartaoRef: RefObject<HTMLDivElement | null>;
  lugar: { left: number; top: number } | null;
  children: ReactNode;
}) {
  if (!lugar) return null;
  return (
    <div
      ref={cartaoRef}
      className="pointer-events-none fixed z-50 hidden w-64 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 shadow-lg sm:block"
      style={{ left: lugar.left, top: lugar.top }}
    >
      {children}
    </div>
  );
}

/** Uma linha "rótulo ... valor" do cartão. */
export function LinhaCartao({ rotulo, valor, tom = "" }: { rotulo: string; valor: string; tom?: string }) {
  return (
    <p className="flex justify-between gap-3 text-neutral-600">
      <span>{rotulo}</span>
      <span className={`font-medium tabular-nums text-neutral-900 ${tom}`}>{valor}</span>
    </p>
  );
}
