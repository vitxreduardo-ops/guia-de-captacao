import { AdminNavList } from "@/components/admin/AdminNavList";

/**
 * Barra de atalhos do desktop. Fica no layout, e não na página, porque o
 * ganho todo é poder pular de Orçamento pra Backlog sem passar pelo Painel.
 *
 * `sticky top-0` em vez de `fixed`: assim ela ocupa lugar no fluxo e o
 * conteúdo não precisa de margem esquerda combinada na mão. Em tela baixa a
 * própria lista rola.
 */
export function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <aside className="hidden w-55 shrink-0 border-r border-neutral-200 bg-white lg:block">
      <nav
        aria-label="Atalhos"
        className="sticky top-0 max-h-svh overflow-y-auto p-3"
      >
        <AdminNavList isAdmin={isAdmin} />
      </nav>
    </aside>
  );
}
