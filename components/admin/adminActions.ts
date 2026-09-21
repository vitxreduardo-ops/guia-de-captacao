import {
  Briefcase,
  CalendarClock,
  House,
  Clapperboard,
  ClipboardList,
  FileSignature,
  Images,
  Kanban,
  LayoutGrid,
  Library,
  PenLine,
  Receipt,
  Radar,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminAction = { href: string; label: string; icon: LucideIcon };

const ACTIONS: AdminAction[] = [
  // Fechada, a barra não mostra o logotipo, que era a única volta pro Painel.
  // Sem este item a pessoa ficava sem caminho de volta pela barra.
  { href: "/admin", label: "Painel", icon: House },
  { href: "/admin/guias", label: "Guia de Captação", icon: Clapperboard },
  { href: "/admin/orcamentos", label: "Orçamento", icon: Receipt },
  { href: "/admin/briefings", label: "Briefing", icon: ClipboardList },
  { href: "/admin/contratos", label: "Contrato", icon: FileSignature },
  { href: "/admin/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/admin/referencias", label: "Referências", icon: LayoutGrid },
  { href: "/admin/galerias", label: "Galeria", icon: Images },
  { href: "/admin/backlog", label: "Backlog", icon: Kanban },
  { href: "/admin/prospeccao", label: "Prospecção", icon: Target },
  { href: "/admin/radar", label: "Radar", icon: Radar },
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
  // O Painel é prefixo de todas as outras rotas: sem a saída antecipada, ele
  // ficaria marcado como atual em toda tela do admin.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
