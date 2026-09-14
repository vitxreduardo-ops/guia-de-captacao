import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Accordion } from "@/components/Accordion";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { ServiceCatalog } from "@/components/admin/ServiceCatalog";
import {
  getInvoice,
  getMonthDeliveries,
  listClientMonths,
  listInvoices,
  listServices,
} from "@/lib/billing";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUsername } from "@/lib/session";
import {
  formatBRL,
  lineTotalCents,
  monthKey,
  monthLabel,
  splitPaidCents,
  sumCents,
} from "@/lib/billingTypes";
import {
  PAYMENT_METHOD_LABELS,
  formatBacklogDateShort,
  type PaymentMethod,
} from "@/lib/backlogTypes";
import { CloseMonthForm } from "@/components/admin/CloseMonthForm";
import { ClientSelect } from "@/components/admin/ClientSelect";
import { MonthTimeline } from "@/components/admin/MonthTimeline";

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

  const [clients, services, invoices, username] = await Promise.all([
    listClients(),
    listServices(),
    listInvoices(),
    getCurrentUsername(),
  ]);

  const clientId = params.cliente || clients[0]?.id || null;

  // A faixa mostra só os meses com movimento deste cliente. O mês aberto entra
  // sempre, senão a própria seleção sumiria da linha do tempo.
  const clientMonths = clientId ? await listClientMonths(clientId) : [];
  const months = [...new Set([...clientMonths, monthKey(new Date())])]
    .sort()
    .reverse();

  // Sem mês na URL, abre no anterior: quem entra aqui está fechando o mês que
  // acabou, não o que está correndo. Abrir no corrente mostrava R$ 0,00 e dava
  // a impressão de que os dados tinham sumido.
  const month = params.mes ? monthKey(params.mes) : months[1] ?? months[0];
  const timelineMonths = [...new Set([...months, month])].sort().reverse();
  const [deliveries, invoice] = clientId
    ? await Promise.all([
        getMonthDeliveries(clientId, month),
        getInvoice(clientId, month),
      ])
    : [[], null];

  const total = sumCents(deliveries);
  const { paidCents, unpaidCents } = splitPaidCents(deliveries);
  const clientName = clients.find((client) => client.id === clientId)?.name ?? "";

  return (
    <div className="mx-auto w-full max-w-5xl py-10">
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

      {clientId ? (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
          <ClientSelect clients={clients} current={clientId} />
        </div>
      ) : null}

      {clientId ? (
        <div className="mb-6">
          <MonthTimeline
            months={timelineMonths}
            current={month}
            clientId={clientId}
          />
        </div>
      ) : null}

      {clientId ? (
        <section className="mb-8 rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-neutral-900">
                {clientName} — {monthLabel(month)}
              </h2>
              <p className="text-2xl font-semibold tracking-[-0.02em] text-neutral-900 tabular-nums">
                {formatBRL(total)}
              </p>
            </div>
            {/* A regra do total precisa ficar à vista sempre, não só quando o
                mês está vazio: é ela que explica por que um card entregue não
                apareceu aqui. */}
            {/* Dois números, um total: a nota é o que foi entregue; o
                pagamento é quando o dinheiro chega. */}
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-emerald-700 tabular-nums">
                {formatBRL(paidCents)} pago
              </span>
              <span className="text-amber-700 tabular-nums">
                {formatBRL(unpaidCents)} a receber
              </span>
            </div>

            <p className="mt-1.5 text-xs text-neutral-500">
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
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                >
                  {/* No celular o título fica com a linha inteira: dividindo
                      com quantidade e total, ele virava reticências. */}
                  <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                    <p className="truncate text-neutral-900">{delivery.title}</p>
                    <p className="text-xs text-neutral-500">
                      {delivery.service_name ?? "Sem serviço"}
                      {delivery.post_date
                        ? ` · entregue ${formatBacklogDateShort(
                            delivery.post_date
                          )}`
                        : ""}
                    </p>
                    {delivery.paid ? (
                      <p className="text-xs text-emerald-700">
                        Pago
                        {delivery.payment_method
                          ? ` · ${
                              PAYMENT_METHOD_LABELS[
                                delivery.payment_method as PaymentMethod
                              ] ?? delivery.payment_method
                            }`
                          : ""}
                        {delivery.paid_at
                          ? ` · ${formatBacklogDateShort(delivery.paid_at)}`
                          : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700">A receber</p>
                    )}
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

      {/* Catálogo e histórico são consulta, não a tarefa: recolhidos, param de
          competir com o fechamento do mês, que é o motivo de abrir esta tela. */}
      <Accordion
        summary={
          <span className="text-sm font-semibold text-neutral-900">
            Produtos e serviços
            <span className="ml-2 font-normal text-neutral-500">
              {services.length}
            </span>
          </span>
        }
        className="rounded-lg border border-neutral-200 bg-white"
        buttonClassName="p-4"
      >
        <div className="border-t border-neutral-100 p-4 pt-3">
          <ServiceCatalog services={services} />
        </div>
      </Accordion>

      <Accordion
        summary={
          <span className="text-sm font-semibold text-neutral-900">
            Notas fechadas
            <span className="ml-2 font-normal text-neutral-500">
              {invoices.length}
            </span>
          </span>
        }
        className="mt-4 rounded-lg border border-neutral-200 bg-white"
        buttonClassName="p-4"
      >
        <div className="border-t border-neutral-100 p-4 pt-3">
        {invoices.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum mês fechado ainda.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {invoices.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5 text-sm"
              >
                <span className="w-full truncate text-neutral-900 sm:w-auto sm:min-w-0 sm:flex-1">
                  {item.client_name}
                </span>
                <span className="text-xs text-neutral-500">
                  {monthLabel(item.month)} · {item.items.length} itens ·{" "}
                  {formatBRL(splitPaidCents(item.items).unpaidCents)} a receber
                </span>
                <span className="w-24 text-right font-medium text-neutral-900 tabular-nums">
                  {formatBRL(item.total_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
        </div>
      </Accordion>
    </div>
  );
}
