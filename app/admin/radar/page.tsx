import { AdminHeader } from "@/components/admin/AdminHeader";
import { RadarTable } from "@/components/admin/RadarTable";
import { listRadar } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const companies = await listRadar();

  return (
    <div className="mx-auto flex w-full flex-1 max-w-[76rem] flex-col pb-10">
      <AdminHeader
        title="Radar"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Radar" }]}
      />

      <p className="mb-4 max-w-[60ch] text-[13px] text-neutral-500">
        Banco de empresas e profissionais da cidade. Serve pra prospectar
        depois e pra olhar a concorrência dos clientes — aqui nada cobra data
        nem etapa. Quando virar conversa, cadastre em Prospecção.
      </p>

      <RadarTable
        companies={companies}
        sectors={companies.map((row) => row.sector)}
      />
    </div>
  );
}
