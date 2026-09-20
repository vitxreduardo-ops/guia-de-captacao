import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProspectDetail } from "@/components/admin/ProspectDetail";
import { listFollowupTemplates } from "@/lib/followups";
import {
  getProspect,
  getProspects,
  listLinkableDocs,
} from "@/lib/prospects";

export const dynamic = "force-dynamic";

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [found, board, docs, followups] = await Promise.all([
    getProspect(id),
    getProspects(),
    listLinkableDocs(),
    listFollowupTemplates(),
  ]);
  if (!found) notFound();

  const { prospect, touches } = found;

  return (
    <div className="mx-auto flex w-full flex-1 max-w-5xl flex-col pb-10">
      <AdminHeader
        title={prospect.name}
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: prospect.name },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor: `${prospect.stage.color}1a`,
            color: prospect.stage.color,
          }}
        >
          {prospect.stage.name}
        </span>
        {prospect.origin ? (
          <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
            {prospect.origin}
          </span>
        ) : null}
        <Link
          href="/admin/prospeccao"
          className="ml-auto text-sm text-neutral-500 hover:text-neutral-800"
        >
          ← Voltar pra fila
        </Link>
      </div>

      <ProspectDetail
        prospect={prospect}
        touches={touches}
        stages={board.stages}
        owners={board.owners}
        clients={board.clients}
        budgets={docs.budgets}
        contracts={docs.contracts}
        followups={followups}
      />
    </div>
  );
}
