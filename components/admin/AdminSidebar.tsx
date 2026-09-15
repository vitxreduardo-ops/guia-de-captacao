import Link from "next/link";
import { AdminAccount } from "@/components/admin/AdminAccount";
import { AdminNavList } from "@/components/admin/AdminNavList";
import { SidebarFrame } from "@/components/admin/SidebarFrame";
import { TatuLogo } from "@/components/TatuLogo";

/**
 * Barra de atalhos do desktop. Fica no layout, e não na página, porque o
 * ganho todo é poder pular de Orçamento pra Backlog sem passar pelo Painel.
 *
 * Carrega a chrome inteira: logo no topo, atalhos no meio, conta no rodapé.
 * Assim o cabeçalho de cada página fica só com a trilha e o título, e sobra
 * faixa pro conteúdo.
 *
 * Fechada, sobram os ícones — e quem some é decidido por CSS, a partir do
 * `data-colapsada` da moldura. Sem isso, cada rótulo lá dentro precisaria
 * receber o estado por prop, e a lista de atalhos deixaria de servir também
 * à gaveta do celular, que não colapsa.
 */
export function AdminSidebar({
  isAdmin,
  colapsada,
}: {
  isAdmin: boolean;
  colapsada: boolean;
}) {
  return (
    <SidebarFrame
      colapsadaNoServidor={colapsada}
      logo={
        // Fechada, o logotipo sai inteiro: em 64px ele viraria um glifo
        // solto, que não se lê nem como marca nem como botão. A volta pro
        // Painel fica no primeiro atalho da lista, que é o "Painel".
        <Link
          href="/admin"
          aria-label="Ir para o Painel"
          className="block rounded group-data-[colapsada=true]/barra:hidden focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <TatuLogo className="block h-[26px] w-auto text-black" />
        </Link>
      }
      rodape={<AdminAccount dropUp stacked />}
    >
      {/* Fechada, a lista deixa de recortar o que transborda pra dica do
          atalho poder sair pela direita da barra. O preço é não rolar numa
          janela baixa — doze ícones pedem ~620px de altura. */}
      <nav
        aria-label="Atalhos"
        className="min-h-0 flex-1 overflow-y-auto px-3 group-data-[colapsada=true]/barra:overflow-visible group-data-[colapsada=true]/barra:px-2"
      >
        <AdminNavList isAdmin={isAdmin} />
      </nav>
    </SidebarFrame>
  );
}
