import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getBacklogBoard } from "@/lib/backlog";
import { getCurrentUsername } from "@/lib/session";
import { Board } from "@/app/admin/backlog/Board";

export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  const [board, username] = await Promise.all([
    getBacklogBoard("entregas"),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[100rem] flex-col px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Entregas por cliente"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Entregas" }]}
        username={username}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <Board
          board={board}
          tabs={
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white">
                Kanban
              </span>
              <Link
                href="/admin/faturamento"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
              >
                Faturamento
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
