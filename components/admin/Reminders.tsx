import Link from "next/link";
import { formatBRL } from "@/lib/billingTypes";
import { dueLabel, dueStatus, remindersSummary } from "@/lib/reminderText";
import type { Reminders as RemindersData } from "@/lib/reminders";

/**
 * O que precisa de você hoje.
 *
 * As duas coisas que ele mostra moram em telas que não se abre todo dia:
 * follow-up atrasado é o vazamento silencioso do funil, e pagamento em aberto
 * só aparece quando alguém vai conferir. Nenhum dos dois grita sozinho — o
 * Painel é onde eles ganham voz.
 *
 * Sem nada pendente o bloco não existe. Uma caixa dizendo "tudo em dia" todo
 * santo dia é a mais rápida das maneiras de ensinar a pular essa parte da
 * tela, e aí o dia em que houver algo também não será visto.
 */
export function Reminders({ data }: { data: RemindersData }) {
  const resumo = remindersSummary(data.followups.length, data.payments.length);
  if (!resumo) return null;

  return (
    <section
      aria-labelledby="lembretes-titulo"
      className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2
        id="lembretes-titulo"
        className="text-sm font-semibold text-neutral-900"
      >
        Pra hoje
      </h2>
      <p className="mt-0.5 mb-3 text-sm text-neutral-500">{resumo}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.followups.length > 0 ? (
          <div>
            <h3 className="mb-1.5 text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Follow-up
            </h3>
            <ul className="space-y-1.5">
              {data.followups.map((prospect) => {
                const prazo = dueLabel(prospect.next_contact_date!, data.today);
                const atrasado =
                  dueStatus(prospect.next_contact_date!, data.today) ===
                  "vencido";
                return (
                  <li key={prospect.id} className="text-sm">
                    <Link
                      href={`/admin/prospeccao/${prospect.id}`}
                      className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                    >
                      {prospect.name}
                    </Link>{" "}
                    <span
                      className={atrasado ? "text-red-700" : "text-neutral-500"}
                    >
                      {prazo}
                    </span>
                    {prospect.next_contact_what ? (
                      <span className="block text-[13px] text-neutral-500">
                        {prospect.next_contact_what}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {data.payments.length > 0 ? (
          <div>
            <h3 className="mb-1.5 text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Pagamento
            </h3>
            <ul className="space-y-1.5">
              {data.payments.map((payment) => {
                const status = dueStatus(payment.dueDate, data.today);
                return (
                  <li key={payment.clientId} className="text-sm">
                    <Link
                      href="/admin/clientes/resumo"
                      className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                    >
                      {payment.clientName}
                    </Link>{" "}
                    <span className="tabular-nums text-neutral-500">
                      {formatBRL(payment.cents)}
                    </span>{" "}
                    <span
                      className={
                        status === "vencido"
                          ? "text-red-700"
                          : status === "hoje"
                            ? "text-amber-700"
                            : "text-neutral-500"
                      }
                    >
                      {status === "vencido" ? "venceu " : "vence "}
                      {dueLabel(payment.dueDate, data.today)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
