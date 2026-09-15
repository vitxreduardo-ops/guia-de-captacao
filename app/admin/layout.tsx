import Link from "next/link";
import { AdminAccount } from "@/components/admin/AdminAccount";
import { AdminMenuButton } from "@/components/admin/AdminMenuButton";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TatuLogo } from "@/components/TatuLogo";
import { getCurrentSession } from "@/lib/session";

/**
 * Moldura única do painel. Antes cada página do admin montava o próprio
 * container e as três medidas que importam no celular — gutter lateral,
 * altura mínima e safe-area — divergiam de tela pra tela.
 *
 * Aqui ficam só as duas que valem pra todas: o gutter (`px-painel`, que já
 * respeita o notch) e a altura (`min-h-svh`, a altura *visível* no iOS, não
 * os 100vh que ficam por baixo da barra do Safari). A largura máxima continua
 * na página, porque um calendário de mês e um formulário de cadastro não têm
 * por que caber na mesma medida.
 *
 * A chrome — logo, atalhos, conta — também mora aqui: barra lateral no
 * desktop, faixa de topo no celular. É a única posição em que ela existe nas
 * 19 telas do admin sem cada página ter que montá-la.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getCurrentSession();

  return (
    <div className="flex min-h-svh">
      {/* Sem sessão (o login mora sob /admin) não há pra onde ir: a barra
          seria uma lista de links que todos devolvem pro login. */}
      {session ? <AdminSidebar isAdmin={session.role === "admin"} /> : null}

      <div className="flex min-w-0 flex-1 flex-col px-painel">
        {/* No celular 220px de barra não cabem: a mesma chrome vira uma faixa
            de topo, com os atalhos atrás do botão de menu. */}
        {session ? (
          <div className="flex items-center gap-3 border-b border-neutral-200 py-3 lg:hidden">
            <AdminMenuButton isAdmin={session.role === "admin"} />
            <Link
              href="/admin"
              aria-label="Ir para o Painel"
              className="block shrink-0 rounded focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <TatuLogo className="block h-[26px] w-auto text-black" />
            </Link>
            <div className="ml-auto shrink-0">
              <AdminAccount />
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
