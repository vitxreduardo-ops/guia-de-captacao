"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Trocar de cliente navega na hora. O endereço continua sendo a fonte da
 * verdade (o link segue colável), só que escolher já é confirmar: um botão
 * "Ver" depois do select era um passo que nunca dizia nada de novo.
 */
export function ClientSelect({
  clients,
  current,
}: {
  clients: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <label
        className="mb-1 block text-xs font-medium text-neutral-600"
        htmlFor="faturamento-cliente"
      >
        Cliente
      </label>
      <select
        id="faturamento-cliente"
        value={current}
        disabled={pending}
        onChange={(event) => {
          const cliente = event.target.value;
          // Sem o mês na URL, a página escolhe o mês anterior de novo — o que
          // é o certo ao trocar de cliente, porque os meses com movimento de
          // um não são os do outro.
          startTransition(() =>
            router.push(`/admin/clientes/faturamento?cliente=${cliente}`)
          );
        }}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 pointer-coarse:min-h-11"
      >
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </div>
  );
}
