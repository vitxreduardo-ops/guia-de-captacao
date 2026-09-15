import Link from "next/link";
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
 * `sticky` em vez de `fixed`: assim ela ocupa lugar no fluxo e o conteúdo não
 * precisa de margem esquerda combinada na mão. Só a lista rola — logo e conta
 * ficam parados nas pontas.
 */
export function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <aside className="hidden w-55 shrink-0 border-r border-neutral-200 bg-white lg:block">
      <div className="sticky top-0 flex h-svh flex-col">
        <div className="shrink-0 p-4">
          <Link
            href="/admin"
            aria-label="Ir para o Painel"
            className="block rounded focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <TatuLogo className="block h-[26px] w-auto text-black" />
          </Link>
        </div>

        <nav aria-label="Atalhos" className="min-h-0 flex-1 overflow-y-auto px-3">
          <AdminNavList isAdmin={isAdmin} />
        </nav>

        <div className="shrink-0 border-t border-neutral-200 p-3">
          <AdminAccount dropUp stacked />
        </div>
      </div>
    </aside>
  );
}
