import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProspectStages } from "@/components/admin/ProspectStages";
import { ProspectTabs } from "@/components/admin/ProspectTabs";
import { getProspects } from "@/lib/prospects";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProspectStagesPage() {
  const [board, username] = await Promise.all([
    getProspects(),
    getCurrentUsername(),
  ]);

  const counts: Record<string, number> = {};
  for (const prospect of board.prospects) {
    counts[prospect.stage_id] = (counts[prospect.stage_id] ?? 0) + 1;
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
      <AdminHeader
        title="Etapas da prospecção"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: "Etapas" },
        ]}
        username={username}
      />

      <div className="mb-4">
        <ProspectTabs active="/admin/prospeccao/etapas" />
      </div>

      <p className="mb-5 text-sm text-neutral-600">
        O nome é seu; o comportamento vem do tipo. Uma etapa marcada como
        &ldquo;perdido&rdquo; pede o motivo na hora de mover, mesmo que você a
        chame de outra coisa. O roteiro é o que você fala nessa etapa — escreva
        antes de encher a lista.
      </p>

      <ProspectStages stages={board.stages} counts={counts} />
    </div>
  );
}
