import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { ClientRegistry, type ClientSummary } from "@/components/admin/ClientRegistry";
import { getOpenByClient } from "@/lib/dinheiro";
import { listGalleryClients } from "@/lib/galleries";
import { getCurrentClientScope } from "@/lib/clientAccess";

export const dynamic = "force-dynamic";

export default async function ClientesCadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ abrir?: string }>;
}) {
  const { abrir } = await searchParams;
  const clientScope = await getCurrentClientScope();
  const [todos, totals] = await Promise.all([
    listGalleryClients({ includeArchived: true, clientScope }),
    getOpenByClient(clientScope),
  ]);

  const clients = todos.filter((client) => !client.archived_at);
  const archived = todos.filter((client) => client.archived_at);

  const summaries: Record<string, ClientSummary> = totals;

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Lista de clientes" },
        ]}
      />

      <div className="mb-6">
        <ClientTabs />
      </div>

      <ClientRegistry
        clients={clients}
        archived={archived}
        summaries={summaries}
        abrir={abrir}
      />
    </div>
  );
}
