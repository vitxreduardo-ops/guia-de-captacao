import { ClientTabs } from "@/components/admin/ClientTabs";
import { getBacklogBoard } from "@/lib/backlog";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { ENTREGAS_TABS } from "@/lib/secoesTabs";

export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  const board = await getBacklogBoard("entregas", await getCurrentClientScope());

  return (
    /* flex-1 pra as colunas ocuparem a altura da tela e o slider encostar
       no fim da página. */
    <div className="flex min-h-0 flex-1 flex-col">
      <KanbanBoard board={board} tabs={<ClientTabs tabs={ENTREGAS_TABS} label="Abas das Entregas" />} />
    </div>
  );
}
