import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { getBacklogBoard } from "@/lib/backlog";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { Calendar } from "@/app/admin/backlog/calendario/Calendar";

export const dynamic = "force-dynamic";

export default async function EntregasCalendarioPage() {
  const clientScope = await getCurrentClientScope();
  const board = await getBacklogBoard("entregas", clientScope);

  return (
    <div className="mx-auto w-full max-w-[100rem] pb-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Calendário de entregas" },
        ]}
      />

      <div className="mb-4">
        <ClientTabs />
      </div>

      <Calendar board={board} mode="entregas" />
    </div>
  );
}
