"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clapperboard, House } from "lucide-react";

const TABS = [
  { href: "/cliente", label: "Início", Icon: House },
  { href: "/cliente/calendario", label: "Calendário", Icon: CalendarDays },
  { href: "/cliente/materiais", label: "Materiais", Icon: Clapperboard },
];

/**
 * Três abas, não mais: o cliente decide em um olhar. Fixa embaixo no celular
 * (polegar) e vira abas no topo do conteúdo no desktop. A aba atual leva peso
 * e traço, não só cor.
 */
export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Portal do cliente"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--tatu-taupe)] bg-[var(--tatu-cream)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-xl md:gap-2">
        {TABS.map(({ href, label, Icon }) => {
          const current = href === "/cliente" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs outline-offset-[-3px] transition-colors md:min-h-11 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm ${
                  current
                    ? "font-semibold text-[var(--tatu-ink)] md:bg-[var(--tatu-ink)] md:text-[var(--tatu-cream)]"
                    : "text-[var(--tatu-muted)] hover:text-[var(--tatu-ink)]"
                }`}
              >
                <Icon className="size-5" strokeWidth={current ? 2.4 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
