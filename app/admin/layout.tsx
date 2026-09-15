import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
 * A barra de atalhos mora aqui, à esquerda de tudo: é a única posição em que
 * ela existe nas 19 telas do admin sem cada página ter que montá-la.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getCurrentSession();

  return (
    <div className="flex min-h-svh">
      {/* Sem sessão (o login mora sob /admin) não há pra onde ir: a barra
          seria uma lista de links que todos devolvem pro login. */}
      {session ? <AdminSidebar isAdmin={session.role === "admin"} /> : null}
      <div className="flex min-w-0 flex-1 flex-col px-painel">{children}</div>
    </div>
  );
}
