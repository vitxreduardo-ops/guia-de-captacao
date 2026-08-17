import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getBacklogBoard } from "@/lib/backlog";
import { getCurrentUsername } from "@/lib/session";
import { Calendar } from "./Calendar";

export const dynamic = "force-dynamic";

export default async function BacklogCalendarPage() {
  const [board, username] = await Promise.all([
    getBacklogBoard(),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Backlog do Instagram"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Backlog", href: "/admin/backlog" },
          { label: "Calendário" },
        ]}
        username={username}
      />

      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link
          href="/admin/backlog"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
        >
          Kanban
        </Link>
        <span className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white">
          Calendário
        </span>
      </div>

      <Calendar board={board} />
    </div>
  );
}
