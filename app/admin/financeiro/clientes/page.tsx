import { Accordion } from "@/components/Accordion";
import { ServiceCatalog } from "@/components/admin/ServiceCatalog";
import { listServices } from "@/lib/billing";
import { ClientRegistry, type ClientSummary } from "@/components/admin/ClientRegistry";
import { getOpenByClient } from "@/lib/dinheiro";
import { listGalleryClients } from "@/lib/galleries";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { listInstagramUsernames } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export default async function ClientesCadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ abrir?: string }>;
}) {
  const { abrir } = await searchParams;
  const clientScope = await getCurrentClientScope();
  const [todos, totals, instagram, services] = await Promise.all([
    listGalleryClients({ includeArchived: true, clientScope }),
    getOpenByClient(clientScope),
    listInstagramUsernames(),
    listServices(),
  ]);

  const clients = todos.filter((client) => !client.archived_at);
  const archived = todos.filter((client) => client.archived_at);

  const summaries: Record<string, ClientSummary> = totals;

  return (
    <>
      <ClientRegistry
        clients={clients}
        archived={archived}
        summaries={summaries}
        instagram={instagram}
        abrir={abrir}
      />

      {/* Preço dos serviços é cadastro, não conta do mês: morava no fim de Contas. */}
      <Accordion
        summary={<span className="text-lg font-semibold text-neutral-900">Serviços e preços</span>}
        className="mt-8 rounded-xl border border-neutral-200 bg-white"
        buttonClassName="p-4"
      >
        <div className="border-t border-neutral-100 p-4 pt-3">
          <ServiceCatalog services={services} />
        </div>
      </Accordion>
    </>
  );
}
