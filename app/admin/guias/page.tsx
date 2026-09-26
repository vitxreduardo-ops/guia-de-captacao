import { Clapperboard, Plus } from "lucide-react";
import Link from "next/link";
import { agruparPorCliente, SEM_CLIENTE, type PastaCliente } from "@/lib/guideFolders";
import { listGuides, type Guide } from "@/lib/guides";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { createGuideAction, deleteGuideAction } from "./actions";

export const dynamic = "force-dynamic";

/** "2026-12-05" -> "05/12/2026" sem passar por Date (evita virar o dia no fuso). */
function formatShootDate(value: string) {
  const [ano, mes, dia] = value.split("-");
  return `${dia}/${mes}/${ano}`;
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
  filters: { month: string; status: string; tag: string }
) {
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
  // Pasta aberta vem da URL (?pasta=), pra sobreviver a recarregar e aos
  // filtros. Uma pasta só no resultado já abre sozinha.
  const pastaAberta =
    pastas.find((p) => p.cliente === String(params.pasta ?? "")) ??
    (pastas.length === 1 ? pastas[0] : null);

  function hrefPasta(cliente: string | null) {
    const q = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][]
    );
    if (cliente) q.set("pasta", cliente);
    const qs = q.toString();
    return qs ? `/admin/guias?${qs}` : "/admin/guias";
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <AdminHeader
        title="Guias de gravação"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Guias" }]}
      />

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
        {/* Filtrar não fecha a pasta que estava aberta. */}
        {pastaAberta ? <input type="hidden" name="pasta" value={pastaAberta.cliente} /> : null}
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
        <>
          {/* O grid não muda ao abrir uma pasta: o conteúdo aparece num
              painel largo embaixo, em vez de a pasta crescer e empurrar as
              vizinhas (deixava buraco na linha). */}
          <nav aria-label="Clientes" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {pastas.map((pasta) => {
              const ativa = pasta.cliente === pastaAberta?.cliente;
              return (
                <Link
                  key={pasta.cliente}
                  href={hrefPasta(ativa ? null : pasta.cliente)}
                  scroll={false}
                  aria-current={ativa ? "true" : undefined}
                  className={`flex items-center gap-2 rounded-lg border p-3 transition-colors sm:gap-3 sm:p-4 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none ${
                    ativa
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <Clapperboard
                    className={`size-5 shrink-0 ${ativa ? "text-white" : "text-neutral-400"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`line-clamp-2 block font-medium leading-snug break-words ${
                        ativa ? "text-white" : pasta.cliente === SEM_CLIENTE ? "text-neutral-500" : "text-neutral-900"
                      }`}
                    >
                      {pasta.cliente}
                    </span>
                    <span className={`block text-xs ${ativa ? "text-neutral-300" : "text-neutral-500"}`}>
                      {pasta.total} {pasta.total === 1 ? "guia" : "guias"}
                      {pasta.proxima ? ` · próxima ${formatShootDate(pasta.proxima)}` : ""}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {pastaAberta ? <PainelPasta pasta={pastaAberta} /> : null}
        </>
      )}
    </div>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="min-w-0">
        <Link
          href={`/admin/guias/${guide.id}`}
          className="font-medium text-neutral-900 hover:underline"
        >
          {guide.title}
        </Link>
        <p className="mt-0.5 text-sm text-neutral-500">
          {guide.shoot_date ? `Gravação ${formatShootDate(guide.shoot_date)}` : "Sem data"} ·{" "}
          <span
            className={guide.status === "published" ? "text-emerald-600" : "text-amber-600"}
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
      <div className="flex shrink-0 items-center gap-3">
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
  );
}

function PainelPasta({ pasta }: { pasta: PastaCliente }) {
  const semCliente = pasta.cliente === SEM_CLIENTE;
  return (
    <section
      aria-label={`Guias de ${pasta.cliente}`}
      className="mt-4 rounded-lg border border-neutral-200 bg-white"
    >
      <h2 className="flex items-center gap-2 border-b border-neutral-200 p-4 font-medium text-neutral-900">
        <Clapperboard className="size-5 text-neutral-900" aria-hidden />
        {pasta.cliente}
        <span className="text-sm font-normal text-neutral-500">
          {pasta.total} {pasta.total === 1 ? "guia" : "guias"}
        </span>
      </h2>

      <div className="space-y-4 p-4">
        {pasta.meses.map((mes) => (
          <section key={mes.chave}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {mes.chave === "sem-data" ? "Sem data de gravação" : formatMonthLabel(mes.chave)}
            </h3>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mes.guias.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </ul>
          </section>
        ))}

        {semCliente ? null : (
          <form action={createGuideAction} className="flex gap-2 pt-1">
            <input type="hidden" name="client_name" value={pasta.cliente} />
            <input
              name="title"
              required
              aria-label={`Título do novo guia de ${pasta.cliente}`}
              placeholder={`Novo guia de ${pasta.cliente} (ex: Campanha Dezembro)`}
              className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="size-4" aria-hidden />
              Novo guia
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
