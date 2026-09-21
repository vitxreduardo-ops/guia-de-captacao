import Link from "next/link";
import { formatBRL } from "@/lib/billingTypes";
import { dueLabel, dueStatus } from "@/lib/reminderText";
import type { BillingDue } from "@/lib/billing";
import type { ProspectRow } from "@/lib/prospectTypes";

const CARD = "rounded-lg border border-neutral-200 bg-white p-4";
const TITULO = "text-sm font-semibold text-neutral-900";
const LINHA =
  "block rounded-md px-2 py-1.5 text-sm transition-transform hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] pointer-coarse:min-h-11";

/**
 * Os contatos com próximo passo marcado pra hoje ou pra trás.
 *
 * Na coluna do "o que tenho pela frente", entre a agenda e as postagens: a
 * mesma pergunta que os dois vizinhos respondem, só que pra prospecção — que
 * é a única das três cujo atraso não aparece em lugar nenhum sozinho.
 *
 * Sem ninguém esperando, o bloco não existe. Um cartão dizendo "nada pra
 * hoje" todo santo dia ensina a pular aquele pedaço da tela, e aí o dia em
 * que houver alguém também não será visto.
 */
export function FollowupsToday({
  prospects,
  today,
}: {
  prospects: ProspectRow[];
  today: string;
}) {
  if (prospects.length === 0) return null;

  return (
    <section aria-labelledby="followup-titulo" className={CARD}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="followup-titulo" className={TITULO}>
          Follow-up hoje
          <span className="font-normal text-neutral-500">
            {` · ${prospects.length}`}
          </span>
        </h2>
        <Link
          href="/admin/prospeccao"
          className="shrink-0 rounded text-xs text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Prospecção
        </Link>
      </div>

      <ul className="-mx-2 space-y-0.5">
        {prospects.map((prospect) => {
          const quando = prospect.next_contact_date ?? today;
          const atrasado = dueStatus(quando, today) === "vencido";
          return (
            <li key={prospect.id}>
              <Link href={`/admin/prospeccao/${prospect.id}`} className={LINHA}>
                <span className="block break-words text-neutral-800">
                  {prospect.name}
                </span>
                <span className="text-xs text-neutral-500">
                  <span className={atrasado ? "text-red-700" : undefined}>
                    {atrasado ? `era ${dueLabel(quando, today)}` : "hoje"}
                  </span>
                  {prospect.next_contact_what
                    ? ` · ${prospect.next_contact_what}`
                    : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * O que vence, do mais próximo ao mais distante.
 *
 * Vem depois das postagens porque é o único dos quatro cartões que não é
 * sobre hoje: a janela olha uma semana pra frente, já que lembrete que nasce
 * no dia do vencimento chega junto com o atraso.
 */
export function PaymentsDue({
  payments,
  today,
}: {
  payments: BillingDue[];
  today: string;
}) {
  if (payments.length === 0) return null;

  return (
    <section aria-labelledby="pagamentos-titulo" className={CARD}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="pagamentos-titulo" className={TITULO}>
          Pagamentos
          <span className="font-normal text-neutral-500">
            {` · ${payments.length}`}
          </span>
        </h2>
        <Link
          href="/admin/clientes/resumo"
          className="shrink-0 rounded text-xs text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Clientes
        </Link>
      </div>

      <ul className="-mx-2 space-y-0.5">
        {payments.map((payment) => {
          const status = dueStatus(payment.dueDate, today);
          return (
            <li key={payment.clientId}>
              <Link href="/admin/clientes/resumo" className={LINHA}>
                <span className="block break-words text-neutral-800">
                  {payment.clientName}
                  <span className="text-neutral-500 tabular-nums">
                    {` · ${formatBRL(payment.cents)}`}
                  </span>
                </span>
                <span
                  className={`text-xs ${
                    status === "vencido"
                      ? "text-red-700"
                      : status === "hoje"
                        ? "text-amber-700"
                        : "text-neutral-500"
                  }`}
                >
                  {status === "vencido" ? "venceu " : "vence "}
                  {dueLabel(payment.dueDate, today)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
