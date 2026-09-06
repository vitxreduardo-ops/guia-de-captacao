"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/clientes/entregas", label: "Entregas" },
  { href: "/admin/clientes/faturamento", label: "Faturamento" },
  { href: "/admin/clientes/resumo", label: "Resumo do ano" },
  { href: "/admin/clientes/cadastro", label: "Cadastro" },
];

/** Navegação da seção Clientes. A aba atual sai do caminho, não de prop. */
export function ClientTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções de clientes" className="flex flex-wrap items-center gap-2 text-sm">
      {TABS.map((tab) => {
        const current = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white"
                : "rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
