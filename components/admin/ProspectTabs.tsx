import Link from "next/link";

const TABS = [
  { href: "/admin/prospeccao", label: "Fila" },
  { href: "/admin/prospeccao/tabela", label: "Tabela" },
  { href: "/admin/prospeccao/etapas", label: "Etapas" },
];

/** As três telas são recortes do mesmo dado; a aba deixa isso explícito em
 * vez de fazer parecer que são lugares diferentes. */
export function ProspectTabs({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {TABS.map((tab) =>
        tab.href === active ? (
          <span
            key={tab.href}
            aria-current="page"
            className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {tab.label}
          </Link>
        )
      )}
    </div>
  );
}
