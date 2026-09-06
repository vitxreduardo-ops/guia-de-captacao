import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { ServiceCatalog } from "@/components/admin/ServiceCatalog";
import { getInvoice, getMonthDeliveries, listInvoices, listServices } from "@/lib/billing";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUsername } from "@/lib/session";
import {
  formatBRL,
  lineTotalCents,
  monthKey,
  monthLabel,
  recentMonths,
  sumCents,
} from "@/lib/billingTypes";
import { CloseMonthForm } from "@/components/admin/CloseMonthForm";

export const dynamic = "force-dynamic";

async function listClients() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_clients")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as { id: string; name: string }[];
}

export default async function FaturamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const months = recentMonths();
  // Sem mês na URL, abre no anterior: quem entra aqui está fechando o mês que
  // acabou, não o que está correndo. Abrir no corrente mostrava R$ 0,00 e dava
  // a impressão de que os dados tinham sumido.
  const month = params.mes ? monthKey(params.mes) : months[1] ?? months[0];

  const [clients, services, invoices, username] = await Promise.all([
    listClients(),
    listServices(),
    listInvoices(),
    getCurrentUsername(),
  ]);

  const clientId = params.cliente || clients[0]?.id || null;
  const [deliveries, invoice] = clientId
    ? await Promise.all([
        getMonthDeliveries(clientId, month),
        getInvoice(clientId, month),
      ])
    : [[], null];

  const total = sumCents(deliveries);
  const clientName = clients.find((client) => client.id === clientId)?.name ?? "";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Faturamento" },
        ]}
        username={username}
      />

      <div className="mb-6">
        <ClientTabs />
      </div>

      {/* Seletor por GET: o link do mês fica compartilhável e a página é
          renderizada no servidor sem estado de cliente. */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div>
          <label
            className="mb-1 block text-xs font-medium text-neutral-600"
            htmlFor="faturamento-cliente"
          >
            Cliente
          </label>
          <select
            id="faturamento-cliente"
            name="cliente"
            defaultValue={clientId ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-1 block text-xs font-medium text-neutral-600"
            htmlFor="faturamento-mes"
          >
            Mês
          </label>
          <select
            id="faturamento-mes"
            name="mes"
            defaultValue={month}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {months.map((option) => (
              <option key={option} value={option}>
                {monthLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11"
        >
          Ver
        </button>
      </form>

      {clientId ? (
        <section className="mb-8 rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-neutral-900">
                {clientName} — {monthLabel(month)}
              </h2>
              <p className="text-lg font-semibold tracking-[-0.02em] text-neutral-900 tabular-nums">
                {formatBRL(total)}
              </p>
            </div>
            {/* A regra do total precisa ficar à vista sempre, não só quando o
                mês está vazio: é ela que explica por que um card entregue não
                apareceu aqui. */}
            <p className="mt-1 text-xs text-neutral-500">
              Soma as entregas com data em {monthLabel(month)} que estão numa
              coluna marcada como &quot;entra na nota&quot; no quadro de{" "}
              <Link href="/admin/clientes/entregas" className="underline">
                Entregas
              </Link>
              .
            </p>
          </div>

          {deliveries.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">
              Nenhuma entrega concluída em {monthLabel(month)}. Se o trabalho já
              saiu, confira a data e a coluna da entrega no quadro — ou troque o
              mês aí em cima.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {deliveries.map((delivery) => (
                <li
                  key={delivery.card_id}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-neutral-900">{delivery.title}</p>
                    <p className="text-xs text-neutral-500">
                      {delivery.service_name ?? "Sem serviço"}
                      {delivery.post_date
                        ? ` · entregue ${delivery.post_date
                            .slice(5)
                            .split("-")
                            .reverse()
                            .join("/")}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {delivery.quantity} × {formatBRL(delivery.unit_price_cents)}
                  </span>
                  <span className="w-24 text-right font-medium text-neutral-900 tabular-nums">
                    {formatBRL(lineTotalCents(delivery))}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-neutral-100 p-4">
            <CloseMonthForm
              clientId={clientId}
              clientName={clientName}
              month={month}
              monthLabel={monthLabel(month)}
              totalCents={total}
              itemCount={deliveries.length}
              zeroPriceCount={
                deliveries.filter((delivery) => delivery.unit_price_cents === 0)
                  .length
              }
              invoice={invoice}
            />
          </div>
        </section>
      ) : (
        <p className="mb-8 text-sm text-neutral-500">
          Cadastre um cliente em Galerias para começar a lançar entregas.
        </p>
      )}

      <ServiceCatalog services={services} />

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          Notas fechadas
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum mês fechado ainda.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {invoices.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-neutral-900">
                  {item.client_name}
                </span>
                <span className="text-xs text-neutral-500">
                  {monthLabel(item.month)} · {item.items.length} itens
                </span>
                <span className="w-24 text-right font-medium text-neutral-900 tabular-nums">
                  {formatBRL(item.total_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
