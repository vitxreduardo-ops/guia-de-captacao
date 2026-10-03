import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";

const TABS = [
  { href: "/admin/area-do-cliente/calendario", label: "Calendário editorial" },
  { href: "/admin/area-do-cliente/materiais", label: "Materiais visíveis" },
  { href: "/admin/area-do-cliente/acessos", label: "Acessos e galeria" },
];

/** Cabeçalho comum das telas da Área do cliente (o que o cliente enxerga no portal). */
export function ClientAreaHeader({ current }: { current: string }) {
  return (
    <>
      <AdminHeader
        title="Área do cliente"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Área do cliente", href: "/admin/area-do-cliente" },
          { label: current },
        ]}
      />
      <div className="mb-6">
        <ClientTabs tabs={TABS} label="Seções da área do cliente" />
      </div>
    </>
  );
}
