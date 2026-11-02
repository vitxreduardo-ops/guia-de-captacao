"use client";

import { useSyncExternalStore } from "react";

const semAssinatura = () => () => {};

/** Volta à página anterior; some quando o guia foi aberto direto (sem histórico). */
export function BotaoVoltar() {
  const temHistorico = useSyncExternalStore(
    semAssinatura,
    () => window.history.length > 1,
    () => false
  );

  if (!temHistorico) return null;

  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900"
    >
      ← Voltar
    </button>
  );
}
