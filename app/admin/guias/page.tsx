import Link from "next/link";
import { listGuides, type Guide } from "@/lib/guides";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { createGuideAction, deleteGuideAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function monthKey(dateValue: string) {
  return dateValue.slice(0, 7); // "YYYY-MM"
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const label = MONTH_LABELS[Number(month) - 1] ?? month;
  return `${label}/${year}`;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

function matchesFilters(
  guide: Guide,
  filters: { client: string; month: string; status: string; tag: string }
) {
  if (filters.client && guide.client_name !== filters.client) return false;
  if (filters.month && (!guide.shoot_date || monthKey(guide.shoot_date) !== filters.month))
    return false;
  if (filters.status && guide.status !== filters.status) return false;
  if (filters.tag && !guide.tags.includes(filters.tag)) return false;
  return true;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    client: String(params.client ?? ""),
    month: String(params.month ?? ""),
    status: String(params.status ?? ""),
    tag: String(params.tag ?? ""),
  };

  const guides = await listGuides();

  const clientOptions = uniqueSorted(guides.map((g) => g.client_name));
  const monthOptions = Array.from(
    new Set(guides.map((g) => (g.shoot_date ? monthKey(g.shoot_date) : "")).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));
  const tagOptions = uniqueSorted(guides.flatMap((g) => g.tags));

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const filteredGuides = guides.filter((guide) => matchesFilters(guide, filters));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader title="Guias de gravação" backHref="/admin" />

      <form
        action={createGuideAction}
        className="mb-6 flex gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input
          name="title"
          placeholder="Título do novo guia (ex: Gravação — Cliente X)"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo guia
        </button>
      </form>

      <form
        method="get"
        className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Cliente
          </label>
          <select
            name="client"
            defaultValue={filters.client}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {clientOptions.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Mês
          </label>
          <select
            name="month"
            defaultValue={filters.month}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Status
          </label>
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Tag
          </label>
          <select
            name="tag"
            defaultValue={filters.tag}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Todas</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Filtrar
        </button>
        {hasActiveFilters ? (
          <Link
            href="/admin/guias"
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            Limpar filtros
          </Link>
        ) : null}
      </form>

      {filteredGuides.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {guides.length === 0
            ? "Nenhum guia criado ainda. Use o formulário acima para começar."
            : "Nenhum guia encontrado com esses filtros."}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filteredGuides.map((guide) => (
            <li
              key={guide.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div>
                <Link
                  href={`/admin/guias/${guide.id}`}
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {guide.title}
                </Link>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {guide.client_name || "Sem cliente definido"} ·{" "}
                  {formatDate(guide.created_at)} ·{" "}
                  <span
                    className={
                      guide.status === "published"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }
                  >
                    {guide.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </p>
                {guide.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {guide.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/guias/${guide.id}`}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  Editar
                </Link>
                <form action={deleteGuideAction}>
                  <input type="hidden" name="id" value={guide.id} />
                  <DeleteButton
                    confirmMessage={`Excluir o guia "${guide.title}"? Essa ação não pode ser desfeita.`}
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
