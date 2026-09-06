import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { ClientRegistry, type ClientSummary } from "@/components/admin/ClientRegistry";
import { getYearTotals } from "@/lib/billing";
import { listGalleryClients } from "@/lib/galleries";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClientesCadastroPage() {
  const year = new Date().getFullYear();
  const [clients, totals, username] = await Promise.all([
    listGalleryClients(),
    getYearTotals(year),
    getCurrentUsername(),
  ]);

  const summaries: Record<string, ClientSummary> = {};
  for (const row of totals) {
    summaries[row.clientId] = {
      entregasNoAno: row.deliveries,
      faturadoNoAnoCents: row.totalCents,
    };
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Cadastro" },
        ]}
        username={username}
      />

      <div className="mb-6">
        <ClientTabs />
      </div>

      <ClientRegistry clients={clients} summaries={summaries} year={year} />
    </div>
  );
}
