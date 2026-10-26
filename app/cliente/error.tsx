"use client";

import Link from "next/link";

/**
 * Falha em qualquer tela do portal: em vez da página de erro do navegador,
 * fica a moldura do portal com um jeito de sair dali.
 */
export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4 rounded-2xl bg-white px-5 py-5">
      <h1 className="text-xl font-semibold">Não foi possível carregar esta tela</h1>
      <p className="text-[var(--tatu-muted)]">Tente de novo. Se continuar, volte ao início.</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-full bg-[var(--tatu-ink)] px-5 font-semibold text-[var(--tatu-cream)]"
        >
          Tentar de novo
        </button>
        <Link href="/cliente" className="inline-flex min-h-11 items-center px-2 font-medium underline underline-offset-4">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
