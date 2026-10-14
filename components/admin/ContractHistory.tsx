"use client";

import { useState } from "react";
import { restoreRevisionAction } from "@/app/admin/contratos/[id]/actions";
import type { ContractRevision } from "@/lib/contracts";

export function ContractHistory({
  contractId,
  revisoes,
}: {
  contractId: string;
  revisoes: ContractRevision[];
}) {
  const [erro, setErro] = useState<string | null>(null);

  async function restaurar(r: ContractRevision, quando: string) {
    if (
      !confirm(
        `Voltar o contrato para a versão de ${quando}? O texto atual fica guardado aqui no histórico.`,
      )
    )
      return;
    const res = await restoreRevisionAction(contractId, r.id);
    if (res.ok) window.location.reload();
    else setErro(res.motivo);
  }

  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-neutral-900">
        Histórico de versões ({revisoes.length})
      </summary>
      <p className="mt-2 text-xs text-neutral-500">
        Uma cópia do texto é guardada a cada 2 minutos de edição, até 100
        versões. Restaurar recarrega a página.
      </p>
      {erro ? <p className="mt-2 text-xs text-red-600">{erro}</p> : null}
      <ul className="mt-3 divide-y divide-neutral-100">
        {revisoes.map((r) => {
          const quando = new Date(r.created_at).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium",
          });
          return (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span className="text-xs text-neutral-700">
                {quando} · {r.body.length.toLocaleString("pt-BR")} caracteres
              </span>
              <button
                type="button"
                onClick={() => restaurar(r, quando)}
                className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
              >
                Restaurar
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
