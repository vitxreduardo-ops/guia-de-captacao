import {
  Briefcase,
  CalendarClock,
  Clapperboard,
  ClipboardList,
  Images,
  Kanban,
  LayoutGrid,
  Library,
  PenLine,
  Receipt,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminAction = { href: string; label: string; icon: LucideIcon };

const ACTIONS: AdminAction[] = [
  { href: "/admin/guias", label: "Guia de Captação", icon: Clapperboard },
  { href: "/admin/orcamentos", label: "Orçamento", icon: Receipt },
  { href: "/admin/briefings", label: "Briefing", icon: ClipboardList },
  { href: "/admin/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/admin/referencias", label: "Referências", icon: LayoutGrid },
  { href: "/admin/galerias", label: "Galeria", icon: Images },
  { href: "/admin/backlog", label: "Backlog", icon: Kanban },
  { href: "/admin/prospeccao", label: "Prospecção", icon: Target },
  { href: "/admin/clientes", label: "Clientes", icon: Briefcase },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/admin/lettering", label: "Lettering", icon: PenLine },
];

const ADMIN_ONLY_ACTIONS: AdminAction[] = [
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
];

export function adminActions(isAdmin: boolean): AdminAction[] {
  return isAdmin ? [...ACTIONS, ...ADMIN_ONLY_ACTIONS] : ACTIONS;
}

/**
 * `/admin/guias/abc` ainda é a tela de Guias — sem o prefixo, só a listagem
 * raiz ficaria marcada e a pessoa perderia a referência ao abrir um item.
 */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
