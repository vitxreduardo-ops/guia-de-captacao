import { ClientTabs } from "@/components/admin/ClientTabs";
import { getBacklogBoard } from "@/lib/backlog";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { Calendar } from "@/app/admin/backlog/calendario/Calendar";
import { ENTREGAS_TABS } from "@/lib/secoesTabs";

export const dynamic = "force-dynamic";

export default async function EntregasCalendarioPage() {
  const board = await getBacklogBoard("entregas", await getCurrentClientScope());

  return (
    <>
      <div className="mb-4">
        <ClientTabs tabs={ENTREGAS_TABS} label="Abas das Entregas" />
      </div>
      <Calendar board={board} mode="entregas" />
    </>
  );
}
