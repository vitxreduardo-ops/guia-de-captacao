import Link from "next/link";
import { ClienteSeletor } from "@/components/admin/financeiro/ClienteSeletor";
import { CARTAO, FOCO, Vazio } from "@/components/admin/financeiro/ui";
import { formatBRL } from "@/lib/billingTypes";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { getOpenByClient } from "@/lib/dinheiro";
import { listGalleryClients } from "@/lib/galleries";
export const dynamic = "force-dynamic";

export default async function Page() {
  const clientScope = await getCurrentClientScope();
  const [todos, abertos] = await Promise.all([
    listGalleryClients({ includeArchived: false, clientScope }),
    getOpenByClient(clientScope),
  ]);
  const clientes = todos
    .filter((c) => !c.archived_at)
    .map((c) => ({ id: c.id, name: c.name, aberto: abertos[c.id]?.openCents ?? 0, atrasado: abertos[c.id]?.atrasado ?? false }))
    .sort((a, b) => Number(b.atrasado) - Number(a.atrasado) || b.aberto - a.aberto || a.name.localeCompare(b.name));

  return (
    <>
      <section className={`${CARTAO} mb-4`}>
        <h2 className="text-lg font-medium text-neutral-900">Financeiro de um cliente</h2>
        <p className="mb-3 text-base text-neutral-600">
          Escolha o cliente para ver tudo dele: o que recebeu, o que falta, os gastos e a margem, sem recorte de mês.
        </p>
        <ClienteSeletor clientes={clientes} />
      </section>

      {clientes.length === 0 ? (
        <Vazio>Nenhum cliente cadastrado ainda.</Vazio>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/financeiro/contas/${c.id}`}
                className={`flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-neutral-50 ${FOCO}`}
              >
                <span className="min-w-0 truncate text-base font-medium text-neutral-900">{c.name}</span>
                <span className={`text-base tabular-nums ${c.atrasado ? "text-red-700" : "text-neutral-600"}`}>
                  {c.aberto > 0 ? `${formatBRL(c.aberto)} em aberto${c.atrasado ? " · atrasado" : ""}` : "Nada em aberto"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
