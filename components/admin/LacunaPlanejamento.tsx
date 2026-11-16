"use client";

import { useActionState, useState } from "react";
import {
  rascunharCampoAction,
  salvarCampoAction,
  type CampoState,
} from "@/app/admin/planejamentos/actions";
import type { CampoTexto } from "@/lib/planejamentoTypes";

/**
 * Um campo que o material não trouxe (ou que a IA rascunhou). A equipe cola o
 * texto e salva, ou pede um rascunho à IA, revisa e salva. Rascunho não
 * revisado fica escondido do cliente.
 */
export function LacunaPlanejamento({
  planejamentoId,
  entregaId,
  campo,
  rotulo,
  inicial,
  rascunho,
}: {
  planejamentoId: string;
  entregaId: string;
  campo: CampoTexto;
  rotulo: string;
  inicial: string;
  rascunho: boolean;
}) {
  // O que a pessoa digitou; null enquanto ela não mexeu.
  const [digitado, setDigitado] = useState<string | null>(null);

  const [salvar, salvarAcao, salvando] = useActionState<CampoState, FormData>(salvarCampoAction, {});
  const [ia, iaAcao, escrevendo] = useActionState<CampoState, FormData>(async (prev, formData) => {
    setDigitado(null); // o rascunho novo vale mais que o que estava digitado
    return rascunharCampoAction(prev, formData);
  }, {});

  const texto = digitado ?? ia.texto ?? inicial;
  const campoHidden = (
    <>
      <input type="hidden" name="id" value={planejamentoId} />
      <input type="hidden" name="entrega" value={entregaId} />
      <input type="hidden" name="campo" value={campo} />
    </>
  );

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
        {rotulo}
        {rascunho || ia.texto ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-700">
            rascunho da IA: revise e salve. O cliente ainda não vê.
          </span>
        ) : null}
        <textarea
          value={texto}
          onChange={(e) => setDigitado(e.target.value)}
          rows={campo === "card" ? 2 : 6}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal focus:border-neutral-500 focus:outline-none"
          placeholder="Cole aqui o texto"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <form action={salvarAcao}>
          {campoHidden}
          <input type="hidden" name="texto" value={texto} />
          <button
            type="submit"
            disabled={salvando || escrevendo || !texto.trim()}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
        <form action={iaAcao}>
          {campoHidden}
          <button
            type="submit"
            disabled={salvando || escrevendo}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-500 disabled:opacity-50"
          >
            {escrevendo ? "Escrevendo…" : "Escrever rascunho com IA"}
          </button>
        </form>
        <p role="status" aria-live="polite" className="text-sm">
          {salvar.erro || ia.erro ? <span className="text-red-600">{salvar.erro || ia.erro}</span> : salvar.salvo ? <span className="text-emerald-600">Salvo.</span> : null}
        </p>
      </div>
    </div>
  );
}
