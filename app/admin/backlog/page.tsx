import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getBacklogBoard } from "@/lib/backlog";
import { KanbanBoard } from "@/components/admin/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const [board] = await Promise.all([
    getBacklogBoard(),
  ]);

  return (
    <div className="mx-auto flex w-full flex-1 max-w-[100rem] flex-col py-10">
      <AdminHeader
        title="Backlog do Instagram"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Backlog" },
        ]}
      />

      {/* flex-1 pra as colunas ocuparem a altura da tela e o slider encostar
          no fim da página. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <KanbanBoard
          board={board}
          tabs={
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white">
                Kanban
              </span>
              <Link
                href="/admin/backlog/calendario"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
              >
                Calendário
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
