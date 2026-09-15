import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { getBacklogBoard } from "@/lib/backlog";
import { KanbanBoard } from "@/components/admin/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  const [board] = await Promise.all([
    getBacklogBoard("entregas"),
  ]);

  return (
    <div className="mx-auto flex w-full flex-1 max-w-[100rem] flex-col pb-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Entregas" },
        ]}
      />

      {/* flex-1 pra as colunas ocuparem a altura da tela e o slider encostar
          no fim da página. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <KanbanBoard board={board} tabs={<ClientTabs />} />
      </div>
    </div>
  );
}
