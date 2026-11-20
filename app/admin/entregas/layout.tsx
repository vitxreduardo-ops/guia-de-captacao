import { AdminHeader } from "@/components/admin/AdminHeader";

/** Moldura das Entregas: mesma largura no quadro e no calendário. As abas
 *  ficam em cada página porque o quadro as põe na própria barra de filtros. */
export default function EntregasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full flex-1 max-w-[100rem] flex-col pb-10">
      <AdminHeader
        title="Entregas"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Entregas" }]}
      />
      {children}
    </div>
  );
}
