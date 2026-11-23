import { CobrarLink } from "@/components/admin/ContaPix";
import { BotaoAcao } from "@/components/admin/financeiro/Acoes";
import { BOTAO } from "@/components/admin/financeiro/ui";
import { markPaidAction } from "@/app/admin/financeiro/actions";
import { markExpensePaidAction } from "@/app/admin/financeiro/saidas";
import { formatBRL } from "@/lib/billingTypes";
import { frasePrazo } from "@/lib/dinheiroTexto";
import { EXPENSE_CATEGORY_LABELS, type Expense } from "@/lib/expensesTypes";
import type { ReceivableRow } from "@/lib/dinheiro";

import { mesLongo } from "@/app/admin/financeiro/_comum";

export const mesLongoCurto = mesLongo;

/** Uma conta a receber: quem, de que mês, quando vence, e os dois toques: Cobrar e Recebi. */
export function LinhaReceber({ row, atrasada }: { row: ReceivableRow; atrasada?: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-base font-medium text-neutral-900">{row.name}</p>
        <p className={`text-sm ${atrasada ? "text-red-700" : "text-neutral-500"}`}>
          {mesLongoCurto(row.month)} · {frasePrazo(row.due)}
        </p>
      </div>
      <span className="text-base font-medium text-neutral-900 tabular-nums">{formatBRL(row.cents)}</span>
      <div className="flex gap-2">
        <CobrarLink
          cliente={row}
          mesNome={mesLongoCurto(row.month)}
          cents={row.cents}
          rotulo="Cobrar"
          ariaLabel={`Cobrar ${row.name} no WhatsApp`}
          className={BOTAO.contorno}
        />
        <BotaoAcao
          action={markPaidAction}
          campos={{ card: row.cardIds }}
          ariaLabel={`Marcar ${formatBRL(row.cents)} de ${row.name} como recebido`}
          variante="cheio"
        >
          Recebi
        </BotaoAcao>
      </div>
    </li>
  );
}

/** Uma conta a pagar. A fixa debita sozinha no dia dela, então não tem botão. */
export function LinhaPagar({ e, atrasada }: { e: Expense; atrasada?: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-base font-medium text-neutral-900">{e.description || "Sem descrição"}</p>
        <p className={`text-sm ${atrasada ? "text-red-700" : "text-neutral-500"}`}>
          {EXPENSE_CATEGORY_LABELS[e.category]}
          {e.clientName ? ` · ${e.clientName}` : ""} · {frasePrazo(e.spentOn)}
        </p>
      </div>
      <span className="text-base font-medium text-neutral-900 tabular-nums">{formatBRL(e.amountCents)}</span>
      {e.recurringId ? (
        <span className="rounded-md bg-neutral-100 px-2 py-1 text-sm text-neutral-600">Todo mês</span>
      ) : (
        <BotaoAcao
          action={markExpensePaidAction}
          campos={{ id: e.id }}
          ariaLabel={`Marcar ${e.description || "saída"} de ${formatBRL(e.amountCents)} como paga`}
          variante="cheio"
        >
          Paguei
        </BotaoAcao>
      )}
    </li>
  );
}
