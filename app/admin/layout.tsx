import Link from "next/link";
import { AdminAccount } from "@/components/admin/AdminAccount";
import { AdminMenuButton } from "@/components/admin/AdminMenuButton";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TatuLogo } from "@/components/TatuLogo";
import { getCurrentSession } from "@/lib/session";
import { isSidebarCollapsed } from "@/lib/sidebarState";

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
  // Lido no servidor pra barra já nascer na largura certa: decidir isso no
  // cliente daria a piscada de aberta-e-fecha a cada carga.
  const [session, colapsada] = await Promise.all([
    getCurrentSession(),
    isSidebarCollapsed(),
  ]);

  return (
    // Fundo bege da moldura, cartão branco por cima: a barra lateral fica
    // solta sobre o fundo, sem painel nem fio, e quem tem borda é o conteúdo.
    <div className="flex min-h-svh bg-neutral-100">
      {/* Sem sessão (o login mora sob /admin) não há pra onde ir: a barra
          seria uma lista de links que todos devolvem pro login. */}
      {session ? (
        <AdminSidebar
          isAdmin={session.role === "admin"}
          colapsada={colapsada}
        />
      ) : null}

      {/* O cartão é o palco: borda fina, canto arredondado e a sombra mais
          baixa que existe — o relevo vem do contraste com o bege, não do
          borrão. `min-h` fecha a altura da tela quando a página é curta, pra
          não sobrar um retângulo pela metade.

          O palco é branco, e os blocos por cima dele são brancos com fio: é
          o fio que os separa, não o fundo. Tentei o palco em quase-branco pra
          dar relevo aos blocos e o preço era alto — todo recuo do app (coluna
          de kanban, caixa de ícone) é `neutral-50`, e passava a ter a mesma
          cor do palco. Bege na moldura, branco no palco, fio nos blocos,
          `neutral-50` nos recuos: quatro degraus, cada um com um trabalho. */}
      <div className="m-2 flex min-h-[calc(100svh_-_1rem)] min-w-0 flex-1 flex-col rounded-xl border border-neutral-200 bg-white px-painel shadow-[0_1px_2px_rgba(30,28,24,0.04)] lg:ml-0">
        {/* No celular 220px de barra não cabem: a mesma chrome vira uma faixa
            de topo, com os atalhos atrás do botão de menu. */}
        {session ? (
          // Material translúcido em vez de faixa opaca com fio: o conteúdo
          // passa por baixo e continua legível, e a separação vem do desfoque
          // e de um degradê curto — não de uma linha de 1px que corta a tela
          // mesmo quando não há nada passando por baixo.
          <div className="sticky top-0 z-30 -mx-painel flex items-center gap-3 bg-white/80 px-painel py-3 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-white/80 after:to-transparent lg:hidden">
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
