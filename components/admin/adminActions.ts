import {
  Briefcase,
  CalendarClock,
  HardDrive,
  House,
  Clapperboard,
  ClipboardList,
  FileSignature,
  Images,
  Kanban,
  LayoutGrid,
  Network,
  Library,
  Newspaper,
  PenLine,
  Receipt,
  ScrollText,
  Radar,
  Target,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminGroup = "Criação" | "Clientes" | "Rotina" | "Sistema";

export type AdminAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sem grupo, o item fica no topo, antes do primeiro título. */
  group?: AdminGroup;
};

// A ordem aqui é a ordem do menu: os itens de um grupo ficam juntos, e o
// título do grupo aparece antes do primeiro deles.
const ACTIONS: AdminAction[] = [
  // Fechada, a barra não mostra o logotipo, que era a única volta pro Painel.
  // Sem este item a pessoa ficava sem caminho de volta pela barra.
  { href: "/admin", label: "Painel", icon: House },
  {
    href: "/admin/guias",
    label: "Guia de Captação",
    icon: Clapperboard,
    group: "Criação",
  },
  {
    href: "/admin/roteiros",
    label: "Roteiros",
    icon: ScrollText,
    group: "Criação",
  },
  {
    href: "/admin/lettering",
    label: "Lettering",
    icon: PenLine,
    group: "Criação",
  },
  {
    href: "/admin/biblioteca",
    label: "Biblioteca",
    icon: Library,
    group: "Criação",
  },
  {
    href: "/admin/referencias",
    label: "Referências",
    icon: LayoutGrid,
    group: "Criação",
  },
  {
    href: "/admin/repertorio",
    label: "Repertório",
    icon: Newspaper,
    group: "Criação",
  },
  {
    href: "/admin/mapas",
    label: "Mapa mental",
    icon: Network,
    group: "Criação",
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: Briefcase,
    group: "Clientes",
  },
  {
    href: "/admin/orcamentos",
    label: "Orçamento",
    icon: Receipt,
    group: "Clientes",
  },
  {
    href: "/admin/briefings",
    label: "Briefing",
    icon: ClipboardList,
    group: "Clientes",
  },
  {
    href: "/admin/contratos",
    label: "Contrato",
    icon: FileSignature,
    group: "Clientes",
  },
  {
    href: "/admin/galerias",
    label: "Galeria",
    icon: Images,
    group: "Clientes",
  },
  {
    href: "/admin/area-do-cliente",
    label: "Área do cliente",
    icon: UserRoundCheck,
    group: "Clientes",
  },
  {
    href: "/admin/prospeccao",
    label: "Prospecção",
    icon: Target,
    group: "Clientes",
  },
  { href: "/admin/radar", label: "Radar", icon: Radar, group: "Clientes" },
  { href: "/admin/backlog", label: "Backlog", icon: Kanban, group: "Rotina" },
  {
    href: "/admin/agenda",
    label: "Agenda",
    icon: CalendarClock,
    group: "Rotina",
  },
  {
    href: "/admin/armazenamento",
    label: "Armazenamento",
    icon: HardDrive,
    group: "Rotina",
  },
];

const ADMIN_ONLY_ACTIONS: AdminAction[] = [
  { href: "/admin/usuarios", label: "Usuários", icon: Users, group: "Sistema" },
];

/** Código de seção a partir do href, pro filtro por `allowed_sections` e pro proxy.ts. */
function sectionCode(href: string): string {
  return href.replace("/admin/", "").replace("/admin", "");
}

/** As seções que dá pra restringir por usuário — Painel fica fora, é sempre visível. */
export function restrictableSections(): { code: string; label: string }[] {
  return ACTIONS.filter((action) => action.href !== "/admin").map((action) => ({
    code: sectionCode(action.href),
    label: action.label,
  }));
}

/**
 * Admin nunca é restrito, mesmo que `allowed_sections` esteja preenchido por
 * engano. Pra quem não é admin, `allowedSections` nulo é "sem restrição" (o
 * padrão hoje); quando não é nulo, filtra pros códigos liberados — o mesmo
 * código usado no `proxy.ts` pra bloquear acesso direto por URL.
 */
export function adminActions(
  isAdmin: boolean,
  allowedSections: string[] | null = null,
): AdminAction[] {
  const base =
    isAdmin || allowedSections === null
      ? ACTIONS
      : ACTIONS.filter((action) =>
          allowedSections.includes(sectionCode(action.href)),
        );
  return isAdmin ? [...base, ...ADMIN_ONLY_ACTIONS] : base;
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
