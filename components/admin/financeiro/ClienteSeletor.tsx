"use client";

import { useRouter } from "next/navigation";

/** Escolher o cliente abre a página dele na hora: um passo só, sem botão de confirmar. */
export function ClienteSeletor({
  clientes,
  atual,
}: {
  clientes: { id: string; name: string }[];
  atual?: string;
}) {
  const router = useRouter();
  return (
    <select
      value={atual ?? ""}
      aria-label="Escolher cliente"
      onChange={(e) => e.target.value && router.push(`/admin/financeiro/contas/${e.target.value}`)}
      className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none sm:w-80"
    >
      <option value="">Escolha um cliente…</option>
      {clientes.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
