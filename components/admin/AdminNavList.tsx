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
          <li key={action.href}>
            <Link
              href={action.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] pointer-coarse:min-h-11 ${
                active
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <action.icon
                aria-hidden="true"
                className={`size-4 shrink-0 ${active ? "text-neutral-900" : "text-neutral-500"}`}
              />
              {action.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
