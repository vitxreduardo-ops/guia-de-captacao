import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { YearBarChart } from "@/components/admin/YearBarChart";
import {
  getOverdueByClient,
  getYearTotals,
  listInvoiceYears,
} from "@/lib/billing";
import { formatBRL } from "@/lib/billingTypes";

export const dynamic = "force-dynamic";

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; cliente?: string }>;
}) {
  const params = await searchParams;
  const [years, overdue] = await Promise.all([
    listInvoiceYears(),
    getOverdueByClient(),
  ]);

  const year = Number(params.ano) || years[0] || new Date().getFullYear();
  const totals = await getYearTotals(year);

  // O filtro de cliente é um recorte da mesma consulta: as barras por mês
  // passam a ser as daquele cliente em vez do somatório de todos.
  const selected = params.cliente && params.cliente !== "todos" ? params.cliente : null;
  const rows = selected
    ? totals.filter((row) => row.clientId === selected)
    : totals;

  const byMonth = Array.from({ length: 12 }, (_, index) =>
    rows.reduce((sum, row) => sum + row.byMonth[index], 0)
  );
  const yearTotal = byMonth.reduce((sum, value) => sum + value, 0);
  const deliveries = rows.reduce((sum, row) => sum + row.deliveries, 0);
  const monthsWithValue = byMonth.filter((value) => value > 0).length;

  // O vencido não depende do ano escolhido: é dívida de hoje, e some da tela
  // se o filtro de cliente estiver em outro.
  const overdueRows = selected
    ? overdue.filter((row) => row.clientId === selected)
    : overdue;
  const overdueCents = overdueRows.reduce((sum, row) => sum + row.cents, 0);
  const overdueByClient = new Map(
    overdue.map((row) => [row.clientId, row.cents])
  );

  const ranking = [...rows]
    .filter((row) => row.totalCents > 0 || row.deliveries > 0)
    .sort((a, b) => b.totalCents - a.totalCents);
  const topCents = ranking[0]?.totalCents ?? 1;

  return (
    <div className="mx-auto w-full max-w-5xl py-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Resumo do ano" },
        ]}
      />

      <div className="mb-6">
        <ClientTabs />
      </div>

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div>
          <label
            className="mb-1 block text-xs font-medium text-neutral-600"
            htmlFor="resumo-ano"
          >
            Ano
          </label>
          <select
            id="resumo-ano"
            name="ano"
            defaultValue={String(year)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-1 block text-xs font-medium text-neutral-600"
            htmlFor="resumo-cliente"
          >
            Cliente
          </label>
          <select
            id="resumo-cliente"
            name="cliente"
            defaultValue={selected ?? "todos"}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="todos">Todos os clientes</option>
            {totals.map((row) => (
              <option key={row.clientId} value={row.clientId}>
                {row.clientName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11"
        >
          Filtrar
        </button>
      </form>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: `Faturado em ${year}`, value: formatBRL(yearTotal) },
          { label: "Entregas no ano", value: String(deliveries) },
          { label: "Meses com nota", value: `${monthsWithValue}/12` },
          {
            label: "Média por mês fechado",
            value: formatBRL(
              monthsWithValue > 0 ? Math.round(yearTotal / monthsWithValue) : 0
            ),
          },
          {
            label: "Vencido hoje",
            value: formatBRL(overdueCents),
            alert: overdueCents > 0,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="text-xs text-neutral-500">{card.label}</p>
            <p
              className={`mt-1 text-lg font-semibold tracking-[-0.02em] tabular-nums ${
                card.alert ? "text-red-600" : "text-neutral-900"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Faturamento mês a mês
        </h2>

        <YearBarChart byMonth={byMonth} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          Por cliente
        </h2>

        {ranking.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhuma nota fechada em {year}.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {ranking.map((row) => (
              <li key={row.clientId} className="px-4 py-3">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-neutral-900">
                    {row.clientName}
                  </span>
                  {overdueByClient.get(row.clientId) ? (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 tabular-nums">
                      {formatBRL(overdueByClient.get(row.clientId) ?? 0)} vencido
                    </span>
                  ) : null}
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {row.deliveries} entregas
                  </span>
                  <span className="w-28 text-right font-medium text-neutral-900 tabular-nums">
                    {formatBRL(row.totalCents)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100">
                  <div
                    className="h-1.5 rounded-full bg-neutral-900"
                    style={{
                      width: `${Math.round((row.totalCents / topCents) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
