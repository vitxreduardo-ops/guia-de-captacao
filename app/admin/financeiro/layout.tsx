import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { FINANCEIRO_TABS } from "@/lib/secoesTabs";

/**
 * Moldura única do Financeiro: título, abas e largura ficam aqui, então a
 * barra de abas não muda de lugar nem de tamanho ao trocar de aba.
 */
export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  // Saída é do estúdio todo: quem só vê alguns clientes nem recebe a aba.
  const tabs = (await getCurrentClientScope()) === null ? FINANCEIRO_TABS : FINANCEIRO_TABS.filter((t) => !t.href.endsWith("/saidas"));
  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <AdminHeader
        title="Financeiro"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Financeiro" }]}
      />
      <div className="mb-4">
        <ClientTabs tabs={tabs} label="Abas do Financeiro" tone="tinta" />
      </div>
      {children}
    </div>
  );
}
