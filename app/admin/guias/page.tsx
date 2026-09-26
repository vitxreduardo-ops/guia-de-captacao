import Link from "next/link";
import { BuscaGuias } from "@/components/admin/BuscaGuias";
import { PastasClientes } from "@/components/admin/PastasClientes";
import { agruparPorCliente, formatMonthLabel, monthKey } from "@/lib/guideFolders";
import { listGuides, type Guide } from "@/lib/guides";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { createGuideAction } from "./actions";

export const dynamic = "force-dynamic";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

/** Sem acento e em minúscula: "cantinho" acha "Cantinho da Infância". */
function fold(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function matchesFilters(
  guide: Guide,
  filters: { q: string; month: string; status: string; tag: string }
) {
  if (filters.q) {
    const alvo = fold(
      [guide.title, guide.client_name, guide.location, ...guide.tags].join(" ")
    );
    // Cada palavra da busca precisa aparecer, em qualquer ordem.
    if (!fold(filters.q).split(/\s+/).every((palavra) => alvo.includes(palavra)))
      return false;
  }
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
    q: String(params.q ?? "").trim(),
    month: String(params.month ?? ""),
    status: String(params.status ?? ""),
    tag: String(params.tag ?? ""),
  };

  const [guides] = await Promise.all([
    listGuides(),
  ]);

  const monthOptions = Array.from(
    new Set(guides.map((g) => (g.shoot_date ? monthKey(g.shoot_date) : "")).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));
  const tagOptions = uniqueSorted(guides.flatMap((g) => g.tags));

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const filteredGuides = guides.filter((guide) => matchesFilters(guide, filters));
  // "Hoje" no fuso do estúdio: o servidor roda em UTC e virava o dia às 21h.
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const pastas = agruparPorCliente(filteredGuides, hoje);
  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <AdminHeader
        title="Guias de gravação"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Guias" }]}
      />

      <BuscaGuias
        busca={filters.q}
        ativo={hasActiveFilters}
        manter={params.pasta ? { pasta: String(params.pasta) } : {}}
        filtros={
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            {/* Os campos são do form da busca (form="busca-guias"): Filtrar ou
                Enter na busca mandam busca e filtros juntos. */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Mês
              </label>
              <select
                form="busca-guias"
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
                form="busca-guias"
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
                form="busca-guias"
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
              form="busca-guias"
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
          </div>
        }
      >
        <form
          action={createGuideAction}
          className="flex gap-2 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <input
            name="title"
            placeholder="Título do novo guia (ex: Gravação — Cliente X)"
            required
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-neutral-800"
          >
            Novo guia
          </button>
        </form>
      </BuscaGuias>



      {filteredGuides.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {guides.length === 0
            ? "Nenhum guia criado ainda. Use o formulário acima para começar."
            : "Nenhum guia encontrado com esses filtros."}
        </p>
      ) : (
        // key: busca/filtro novo recomeça o componente, e a pasta única do
        // resultado abre sozinha em vez de herdar a da busca anterior.
        <PastasClientes
          key={JSON.stringify(filters)}
          pastas={pastas}
          abrirSozinha={pastas.length === 1}
        />
      )}
    </div>
  );
}

