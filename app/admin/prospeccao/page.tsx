import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProspectNew } from "@/components/admin/ProspectNew";
import { ProspectQueue } from "@/components/admin/ProspectQueue";
import { ProspectTabs } from "@/components/admin/ProspectTabs";
import { getProspects } from "@/lib/prospects";
import { todayISO } from "@/lib/prospectTypes";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProspeccaoPage() {
  const [board, username] = await Promise.all([
    getProspects(),
    getCurrentUsername(),
  ]);
  const today = todayISO();

  return (
    <div className="mx-auto flex w-full flex-1 max-w-3xl flex-col py-10">
      <AdminHeader
        title="Prospecção"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Prospecção" }]}
        username={username}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <ProspectTabs active="/admin/prospeccao" />
        <ProspectNew stages={board.stages} clients={board.clients} />
      </div>

      <ProspectQueue
        prospects={board.prospects}
        stages={board.stages}
        today={today}
      />
    </div>
  );
}
