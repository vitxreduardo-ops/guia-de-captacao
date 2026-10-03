import { AdminHeader } from "@/components/admin/AdminHeader";
import { ColumnVisibilityRow } from "@/components/admin/ColumnVisibilityRow";
import { listEntregasColumnsWithCounts } from "@/lib/backlog";

export const dynamic = "force-dynamic";

export default async function MateriaisVisiveisPage() {
  const columns = await listEntregasColumnsWithCounts();

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Materiais visíveis"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Área do cliente", href: "/admin/area-do-cliente" },
          { label: "Materiais visíveis" },
        ]}
      />
      <p className="mb-4 text-sm text-neutral-600">
        Escolha quais colunas do quadro de Entregas o cliente enxerga no
        portal. As entregas dele nas colunas marcadas aparecem em Materiais e
        em Próximas postagens; as outras ficam só com a equipe.
      </p>
      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {columns.map((c) => (
          <ColumnVisibilityRow
            key={c.id}
            id={c.id}
            name={c.name}
            color={c.color}
            cards={c.cards}
            initial={c.clientVisible}
          />
        ))}
      </ul>
    </div>
  );
}
