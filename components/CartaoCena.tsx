"use client";

import { useOptimistic, type ReactNode } from "react";
import { toggleSceneRecordedAction } from "@/app/guia/[slug]/actions";

/**
 * Cena do guia público com o "Gravar". O ✓ e o verde mudam no toque, antes do
 * servidor responder: no set, esperar a ida e volta fazia parecer que o toque
 * não pegou. Se o servidor falhar, o estado volta sozinho ao real.
 */
export function CartaoCena({
  id,
  slug,
  gravada,
  titulo,
  children,
}: {
  id: string;
  slug: string;
  gravada: boolean;
  titulo: string;
  children: ReactNode;
}) {
  const [marcada, setMarcada] = useOptimistic(gravada);

  return (
    <div
      className={`rounded-md border p-3 transition-colors duration-200 ${
        marcada ? "border-green-300 bg-green-50" : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">{titulo}</p>
        <form
          action={async (formData) => {
            setMarcada(!marcada);
            await toggleSceneRecordedAction(formData);
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="recorded" value={String(!marcada)} />
          <button
            type="submit"
            aria-pressed={marcada}
            // min-h-10: alvo de toque de dedo no set, não de cursor.
            className={`flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-[scale,background-color,border-color,color] duration-150 active:scale-[0.96] motion-reduce:active:scale-100 ${
              marcada
                ? "border-green-300 bg-green-100 text-green-700"
                : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors duration-150 ${
                marcada ? "border-green-600 bg-green-600 text-white" : "border-neutral-300"
              }`}
              aria-hidden
            >
              {marcada ? "✓" : ""}
            </span>
            {marcada ? "Gravada" : "Gravar"}
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
