import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { EditorialCapture } from "@/components/admin/EditorialCapture";
import { EditorialClientSelect } from "@/components/admin/EditorialClientSelect";
import { IdeaRow } from "@/components/admin/IdeaRow";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { listGalleryClients } from "@/lib/galleries";
import { listIdeas } from "@/lib/editorialCalendar";
import { groupByMonth, MONTH_NAMES, nextMonths } from "@/lib/editorialMonths";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ cliente?: string; ano?: string }>;

export default async function CalendarioPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clients = await listGalleryClients({ clientScope: await getCurrentClientScope() });
  const client = clients.find((c) => c.id === params.cliente) ?? clients[0];
  const now = new Date();
  const year = Number(params.ano) || now.getFullYear();

  const months = client
    ? groupByMonth(await listIdeas(client.id, year, { includeInternal: true }))
    : [];
  const filled = months.map((ideas, i) => ({ ideas, i })).filter((m) => m.ideas.length);
  const empty = months.map((ideas, i) => ({ ideas, i })).filter((m) => !m.ideas.length);

  const yearLink = (y: number) => `/admin/clientes/calendario?cliente=${client?.id}&ano=${y}`;

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Calendário" },
        ]}
      />
      <div className="mb-6">
        <ClientTabs />
      </div>

      {!client ? (
        <p className="text-sm text-neutral-500">Cadastre um cliente para anotar ideias.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <EditorialClientSelect clients={clients} current={client.id} />
            <Link
              href={`/cliente/previa?cliente=${client.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50"
            >
              <Eye className="size-4" aria-hidden />
              Ver como o cliente
            </Link>
          </div>

          <EditorialCapture clientId={client.id} months={nextMonths(now, 12)} />

          <div className="flex items-center gap-3">
            <Link href={yearLink(year - 1)} className="text-sm text-neutral-600 underline underline-offset-4">
              ← {year - 1}
            </Link>
            <h2 className="text-lg font-semibold tabular-nums">{year}</h2>
            <Link href={yearLink(year + 1)} className="text-sm text-neutral-600 underline underline-offset-4">
              {year + 1} →
            </Link>
          </div>

          {filled.length ? (
            <div className="space-y-5">
              {filled.map(({ ideas, i }) => (
                <section key={i} aria-labelledby={`m-${i}`}>
                  <h3 id={`m-${i}`} className="mb-1.5 text-sm font-semibold text-neutral-700">
                    {MONTH_NAMES[i]}
                  </h3>
                  <ul className="space-y-1.5">
                    {ideas.map((idea) => (
                      <IdeaRow key={idea.id} idea={idea} clientId={client.id} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Nenhuma ideia em {year} ainda. Anote a primeira acima.
            </p>
          )}

          {filled.length && empty.length ? (
            <p className="text-sm text-neutral-500">
              Sem ideias em: {empty.map((m) => MONTH_NAMES[m.i]).join(", ")}.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
