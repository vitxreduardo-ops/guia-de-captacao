import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { ClientRegistry, type ClientSummary } from "@/components/admin/ClientRegistry";
import { getYearTotals } from "@/lib/billing";
import { listGalleryClients } from "@/lib/galleries";
import { listClientLogins } from "@/lib/users";
import { getCurrentClientScope } from "@/lib/clientAccess";

export const dynamic = "force-dynamic";

export default async function ClientesCadastroPage() {
  const year = new Date().getFullYear();
  const clientScope = await getCurrentClientScope();
  const [todos, totals] = await Promise.all([
    listGalleryClients({ includeArchived: true, clientScope }),
    getYearTotals(year, clientScope),
  ]);

  const clients = todos.filter((client) => !client.archived_at);
  const archived = todos.filter((client) => client.archived_at);

  const logins = await listClientLogins();

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
        logins={logins}
      />
    </div>
  );
}
