"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminActions, isActive } from "@/components/admin/adminActions";

/**
 * A lista de atalhos em si. Serve tanto à barra fixa do desktop quanto à
 * gaveta do celular — é a mesma navegação, só muda a moldura em volta.
 */
export function AdminNavList({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  /** A gaveta usa pra se fechar quando a pessoa escolhe pra onde vai. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {adminActions(isAdmin).map((action) => {
        const active = isActive(pathname, action.href);
        return (
          <li key={action.href} className="group/atalho relative">
            <Link
              href={action.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-[color,background-color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] group-data-[colapsada=true]/barra:justify-center group-data-[colapsada=true]/barra:px-0 pointer-coarse:min-h-11 ${
                active
                  ? "border border-neutral-200 bg-white font-medium text-neutral-900 shadow-[0_1px_2px_rgba(30,28,24,0.04)]"
                  : "border border-transparent text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900"
              }`}
            >
              <action.icon
                aria-hidden="true"
                className={`size-4 shrink-0 ${active ? "text-neutral-900" : "text-neutral-500"}`}
              />
              <span className="truncate group-data-[colapsada=true]/barra:sr-only">
                {action.label}
              </span>
            </Link>

            {/* Dica própria em vez do `title` do navegador: o nativo só
                aparece depois de ~1s, nunca no toque, e não acompanha o foco
                por teclado. Só existe com a barra fechada, que é quando o
                rótulo saiu da tela. */}
            <span
              role="presentation"
              className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 hidden -translate-y-1/2 rounded-md bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-100 group-hover/atalho:opacity-100 group-focus-within/atalho:opacity-100 group-data-[colapsada=true]/barra:block"
            >
              {action.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
