import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { toggleSidebar } from "@/app/admin/sidebarActions";
import { AdminAccount } from "@/components/admin/AdminAccount";
import { AdminNavList } from "@/components/admin/AdminNavList";
import { TatuLogo } from "@/components/TatuLogo";

/**
 * Barra de atalhos do desktop. Fica no layout, e não na página, porque o
 * ganho todo é poder pular de Orçamento pra Backlog sem passar pelo Painel.
 *
 * Carrega a chrome inteira: logo no topo (a volta pro Painel), atalhos no
 * meio, conta no rodapé. Assim o cabeçalho de cada página fica só com a
 * trilha e o título, e sobra faixa pro conteúdo.
 *
 * Fechada, sobram os ícones — e quem some é decidido por CSS, a partir do
 * `data-colapsada` daqui. Sem isso, cada rótulo lá dentro precisaria receber
 * o estado por prop, e a lista de atalhos deixaria de servir também à gaveta
 * do celular, que não colapsa.
 */
export function AdminSidebar({
  isAdmin,
  colapsada,
}: {
  isAdmin: boolean;
  colapsada: boolean;
}) {
  return (
    <aside
      data-colapsada={colapsada}
      className="group/barra hidden w-55 shrink-0 data-[colapsada=true]:w-16 lg:block"
    >
      {/* `sticky` em vez de `fixed`: assim a barra ocupa lugar no fluxo e o
          conteúdo não precisa de margem esquerda combinada na mão. Só a lista
          rola — logo e conta ficam parados nas pontas. */}
      <div className="sticky top-0 flex h-svh flex-col">
        <div className="flex shrink-0 items-center gap-2 p-4 group-data-[colapsada=true]/barra:justify-center group-data-[colapsada=true]/barra:px-0">
          {/* Fechada, o logotipo sai inteiro: em 64px ele viraria um glifo
              solto, que não se lê como marca nem como botão. Sobra o botão de
              expandir, e a volta pro Painel continua no primeiro atalho. */}
          <Link
            href="/admin"
            aria-label="Ir para o Painel"
            className="block rounded group-data-[colapsada=true]/barra:hidden focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <TatuLogo className="block h-[26px] w-auto text-black" />
          </Link>

          <form
            action={toggleSidebar}
            className="ml-auto shrink-0 group-data-[colapsada=true]/barra:mx-auto"
          >
            <button
              type="submit"
              aria-expanded={!colapsada}
              aria-label={colapsada ? "Expandir atalhos" : "Recolher atalhos"}
              title={colapsada ? "Expandir" : "Recolher"}
              className="grid size-8 place-items-center rounded-md text-neutral-500 transition-transform hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
            >
              {colapsada ? (
                <PanelLeftOpen aria-hidden="true" className="size-4" />
              ) : (
                <PanelLeftClose aria-hidden="true" className="size-4" />
              )}
            </button>
          </form>
        </div>

        <nav
          aria-label="Atalhos"
          className="min-h-0 flex-1 overflow-y-auto px-3 group-data-[colapsada=true]/barra:px-2"
        >
          <AdminNavList isAdmin={isAdmin} />
        </nav>

        <div className="shrink-0 p-3">
          <AdminAccount dropUp stacked />
        </div>
      </div>
    </aside>
  );
}
