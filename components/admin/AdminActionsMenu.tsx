"use client";

import {
  CalendarClock,
  Clapperboard,
  ClipboardList,
  Images,
  Kanban,
  Library,
  PenLine,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Accordion } from "@/components/Accordion";

const ACTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/guias", label: "Guia de Captação", icon: Clapperboard },
  { href: "/admin/orcamentos", label: "Orçamento", icon: Receipt },
  { href: "/briefing", label: "Briefing do cliente", icon: ClipboardList },
  { href: "/admin/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/admin/galerias", label: "Galeria do cliente", icon: Images },
  { href: "/admin/backlog", label: "Backlog do Instagram", icon: Kanban },
  { href: "/admin/agenda", label: "Minha Agenda", icon: CalendarClock },
  { href: "/admin/lettering", label: "Lettering", icon: PenLine },
];

const ADMIN_ONLY_ACTIONS: typeof ACTIONS = [
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
];

export function AdminActionsMenu({
  isAdmin = false,
  defaultOpen = false,
}: {
  isAdmin?: boolean;
  /** Aberto no desktop, recolhido no mobile pra não empurrar as tarefas. */
  defaultOpen?: boolean;
}) {
  const actions = isAdmin ? [...ACTIONS, ...ADMIN_ONLY_ACTIONS] : ACTIONS;

  return (
    <Accordion
      summary={
        <span className="text-sm font-semibold text-neutral-900">Atalhos</span>
      }
      defaultOpen={defaultOpen}
      className="rounded-lg border border-neutral-200 bg-white"
      buttonClassName="p-4"
    >
      <nav aria-label="Atalhos" className="border-t border-neutral-100 p-2">
        <ul className="space-y-0.5">
          {actions.map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-neutral-700 transition-transform hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] pointer-coarse:min-h-11"
              >
                <action.icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-neutral-500"
                />
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Accordion>
  );
}
