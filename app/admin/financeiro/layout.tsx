import { AdminHeader } from "@/components/admin/AdminHeader";
import { OcultarValores } from "@/components/admin/financeiro/OcultarValores";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { FINANCEIRO_SO_ESTUDIO, FINANCEIRO_TABS } from "@/lib/secoesTabs";

/**
 * Moldura única do Financeiro: título, abas e largura ficam aqui, então a
 * barra de abas não muda de lugar nem de tamanho ao trocar de aba.
 */
export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  // Caixa e saída são do estúdio todo: quem só vê alguns clientes nem recebe essas abas.
  const tabs = (await getCurrentClientScope()) === null ? FINANCEIRO_TABS : FINANCEIRO_TABS.filter((t) => !FINANCEIRO_SO_ESTUDIO.includes(t.href));
  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <AdminHeader
        title="Financeiro"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Financeiro" }]}
      />
      <div className="mb-4 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ClientTabs tabs={tabs} label="Abas do Financeiro" tone="tinta" />
        </div>
        <OcultarValores alvo="[data-valores]" />
      </div>
      <div data-valores>{children}</div>
    </div>
  );
}
