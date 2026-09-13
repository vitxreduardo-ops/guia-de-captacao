import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProspectTabs } from "@/components/admin/ProspectTabs";
import { RadarTable } from "@/components/admin/RadarTable";
import { listRadar } from "@/lib/prospects";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const [companies, username] = await Promise.all([
    listRadar(),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[76rem] flex-col px-4 py-10 sm:px-6">
      <AdminHeader
        title="Prospecção"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: "Radar" },
        ]}
        username={username}
      />

      <div className="mb-4">
        <ProspectTabs active="/admin/prospeccao/radar" />
      </div>

      <p className="mb-4 max-w-[60ch] text-[13px] text-neutral-500">
        Empresas que você foi vendo por aí e quer prospectar depois. Aqui nada
        cobra data nem etapa — quando virar conversa, cadastre na Fila.
      </p>

      <RadarTable
        companies={companies}
        sectors={companies.map((row) => row.sector)}
      />
    </div>
  );
}
