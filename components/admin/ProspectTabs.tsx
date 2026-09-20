import Link from "next/link";

const TABS = [
  { href: "/admin/prospeccao", label: "Fila" },
  { href: "/admin/prospeccao/tabela", label: "Tabela" },
  { href: "/admin/prospeccao/comercial", label: "Comercial" },
  { href: "/admin/prospeccao/modelos", label: "Modelos" },
  { href: "/admin/prospeccao/radar", label: "Radar" },
  { href: "/admin/prospeccao/etapas", label: "Etapas" },
];

/** As telas são recortes do mesmo dado; a aba deixa isso explícito em vez de
 * fazer parecer que são lugares diferentes. */
export function ProspectTabs({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {TABS.map((tab) =>
        tab.href === active ? (
          <span
            key={tab.href}
            aria-current="page"
            className="inline-flex min-h-10 items-center rounded-md bg-neutral-900 px-3.5 font-medium text-white sm:min-h-0 sm:px-3 sm:py-1.5"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className="inline-flex min-h-10 items-center rounded-md border border-neutral-300 px-3.5 text-neutral-700 hover:bg-neutral-50 sm:min-h-0 sm:px-3 sm:py-1.5 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {tab.label}
          </Link>
        )
      )}
    </div>
  );
}
