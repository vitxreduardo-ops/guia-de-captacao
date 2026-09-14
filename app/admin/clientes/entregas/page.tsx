import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { getBacklogBoard } from "@/lib/backlog";
import { getCurrentUsername } from "@/lib/session";
import { KanbanBoard } from "@/components/admin/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  const [board, username] = await Promise.all([
    getBacklogBoard("entregas"),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto flex w-full flex-1 max-w-[100rem] flex-col py-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Entregas" },
        ]}
        username={username}
      />

      {/* flex-1 pra as colunas ocuparem a altura da tela e o slider encostar
          no fim da página. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <KanbanBoard board={board} tabs={<ClientTabs />} />
      </div>
    </div>
  );
}
