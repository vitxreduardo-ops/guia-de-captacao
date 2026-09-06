import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { getYearTotals, listInvoiceYears } from "@/lib/billing";
import { getCurrentUsername } from "@/lib/session";
import { formatBRL } from "@/lib/billingTypes";

export const dynamic = "force-dynamic";

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; cliente?: string }>;
}) {
  const params = await searchParams;
  const [years, username] = await Promise.all([
    listInvoiceYears(),
    getCurrentUsername(),
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
  const peak = Math.max(...byMonth, 1);
  const deliveries = rows.reduce((sum, row) => sum + row.deliveries, 0);
  const monthsWithValue = byMonth.filter((value) => value > 0).length;

  const ranking = [...rows]
    .filter((row) => row.totalCents > 0 || row.deliveries > 0)
    .sort((a, b) => b.totalCents - a.totalCents);
  const topCents = ranking[0]?.totalCents ?? 1;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Resumo do ano" },
        ]}
        username={username}
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
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Filtrar
        </button>
      </form>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="text-xs text-neutral-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Faturamento mês a mês
        </h2>

        {/* Barras em CSS puro: a altura é a fração do maior mês do período.
            Uma biblioteca de gráfico aqui seria peso sem ganho. */}
        <div className="flex h-40 items-end gap-1.5">
          {byMonth.map((value, index) => (
            <div
              key={MONTH_SHORT[index]}
              // `h-full` porque a barra tem altura em porcentagem: sem uma
              // altura definida no pai, a porcentagem não resolve e a barra
              // some.
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] text-neutral-500">
                {value > 0 ? formatBRL(value) : ""}
              </span>
              <div
                role="img"
                aria-label={`${MONTH_SHORT[index]}: ${formatBRL(value)}`}
                style={{ height: `${Math.round((value / peak) * 90)}%` }}
                className={`min-h-[2px] w-full rounded-t ${
                  value > 0 ? "bg-neutral-900" : "bg-neutral-100"
                }`}
              />
              <span className="text-[10px] text-neutral-500">
                {MONTH_SHORT[index]}
              </span>
            </div>
          ))}
        </div>
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
                  <span className="text-xs text-neutral-500">
                    {row.deliveries} entregas
                  </span>
                  <span className="w-28 text-right font-medium text-neutral-900">
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
