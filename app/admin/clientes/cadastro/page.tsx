import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { ClientRegistry, type ClientSummary } from "@/components/admin/ClientRegistry";
import { getYearTotals } from "@/lib/billing";
import { listGalleryClients } from "@/lib/galleries";

export const dynamic = "force-dynamic";

export default async function ClientesCadastroPage() {
  const year = new Date().getFullYear();
  const [todos, totals] = await Promise.all([
    listGalleryClients({ includeArchived: true }),
    getYearTotals(year),
  ]);

  const clients = todos.filter((client) => !client.archived_at);
  const archived = todos.filter((client) => client.archived_at);

  const summaries: Record<string, ClientSummary> = {};
  for (const row of totals) {
    summaries[row.clientId] = {
      entregasNoAno: row.deliveries,
      faturadoNoAnoCents: row.totalCents,
    };
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Cadastro" },
        ]}
      />

      <div className="mb-6">
        <ClientTabs />
      </div>

      <ClientRegistry
        clients={clients}
        archived={archived}
        summaries={summaries}
        year={year}
      />
    </div>
  );
}
