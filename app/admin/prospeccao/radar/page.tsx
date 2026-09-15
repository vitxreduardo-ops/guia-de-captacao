import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProspectTabs } from "@/components/admin/ProspectTabs";
import { RadarTable } from "@/components/admin/RadarTable";
import { listRadar } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const [companies] = await Promise.all([
    listRadar(),
  ]);

  return (
    <div className="mx-auto flex w-full flex-1 max-w-[76rem] flex-col py-10">
      <AdminHeader
        title="Prospecção"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: "Radar" },
        ]}
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
