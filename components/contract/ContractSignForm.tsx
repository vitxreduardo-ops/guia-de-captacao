"use client";

import { useActionState } from "react";
import {
  signContractAction,
  type SignState,
} from "@/app/contrato/[slug]/actions";

/**
 * O aceite. Um clique que grava nome, documento e instante — o que o link
 * acrescenta a um PDF anexado no e-mail.
 *
 * Não é assinatura com certificado digital, e o texto abaixo do botão diz
 * isso: prometer mais do que se entrega num contrato é o pior lugar pra
 * arredondar.
 */
export function ContractSignForm({ slug }: { slug: string }) {
  const [estado, formAction, enviando] = useActionState<SignState, FormData>(
    signContractAction,
    {}
  );

  if (estado.ok) {
    return (
      <p className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
        Contrato aceito. Uma cópia fica registrada com a data e hora deste
        aceite — pode fechar esta página.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-xs font-medium text-[var(--tatu-ink)]/70"
            htmlFor="signed_name"
          >
            Seu nome completo
          </label>
          <input
            id="signed_name"
            name="signed_name"
            required
            autoComplete="name"
            className="w-full rounded-md border border-[var(--tatu-ink)]/20 bg-white px-3 py-2 text-sm focus:border-[var(--tatu-ink)] focus:outline-none"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-xs font-medium text-[var(--tatu-ink)]/70"
            htmlFor="signed_document"
          >
            CPF ou CNPJ
          </label>
          <input
            id="signed_document"
            name="signed_document"
            required
            inputMode="numeric"
            className="w-full rounded-md border border-[var(--tatu-ink)]/20 bg-white px-3 py-2 text-sm focus:border-[var(--tatu-ink)] focus:outline-none"
          />
        </div>
      </div>

      {estado.erro ? (
        <p role="alert" className="text-sm text-red-700">
          {estado.erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-[var(--tatu-ink)] px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Registrando…" : "Li e aceito este contrato"}
      </button>

      <p className="text-xs text-[var(--tatu-ink)]/60">
        O aceite registra seu nome, documento, data e hora. Não substitui
        assinatura com certificado digital.
      </p>
    </form>
  );
}
