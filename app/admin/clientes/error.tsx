"use client";

import Link from "next/link";

/**
 * Rede e Supabase falham; quando isso acontece no meio de um fechamento de
 * mês, cair numa tela em branco assusta mais do que o erro. A seção inteira
 * compartilha este limite: diz o que quebrou, oferece tentar de novo e não
 * some com o caminho de volta.
 */
export default function ClientesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-lg font-semibold text-neutral-900">
        Não deu para carregar esta tela
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Foi um erro ao buscar os dados, não uma perda: nada do que estava salvo
        foi alterado. Tente de novo — se insistir, o banco pode estar fora do ar.
      </p>

      {error.digest ? (
        <p className="mt-2 text-xs text-neutral-400">
          Código do erro: {error.digest}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11"
        >
          Tentar de novo
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 transition-transform hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11"
        >
          Voltar ao Painel
        </Link>
      </div>
    </div>
  );
}
