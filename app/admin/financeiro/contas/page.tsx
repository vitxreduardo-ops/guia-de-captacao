import Link from "next/link";
import { DinheiroClientes } from "@/components/admin/DinheiroClientes";
import { getMoneyMonth } from "@/lib/dinheiro";
import { formatBRL } from "@/lib/billingTypes";
import { FALTA_ESTILO, FOCO, Numero, href, lerParametros, shiftMonth, SetaMes } from "../_comum";
export const dynamic = "force-dynamic";

async function ContasAba({
  scope, month, thisMonth, nome, mesNome,
}: {
  scope: string[] | null; month: string; thisMonth: string; nome: string; mesNome: (m: string) => string;
}) {
  const data = await getMoneyMonth(month, scope);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <SetaMes href={href("contas", shiftMonth(month, -1))} lado="anterior" />
        <div className="text-center">
          <h2 className="text-xl font-medium text-neutral-900 first-letter:uppercase">{nome}</h2>
          {month !== thisMonth ? (
            <Link href={href("contas")} className="text-base text-neutral-600 underline">Voltar para este mês</Link>
          ) : null}
        </div>
        <SetaMes href={href("contas", shiftMonth(month, 1))} lado="proximo" />
      </div>

      <p className="mb-4 text-base text-neutral-600">
        O cliente paga no mês seguinte: o que foi feito em {mesNome(month)} vence em {mesNome(shiftMonth(month, 1))}.
        Para mudar o dia, toque em Editar na entrega ou em Mudar vencimento no cliente.
      </p>

      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <Numero label="Pago" value={data.paidCents} note={`dos trabalhos de ${mesNome(month)}`} />
        <Numero label="A receber" value={data.openCents - data.monthOverdueCents} note="no prazo" />
        <Numero label="Atrasado" value={data.overdueCents} tone={data.overdueCents ? "text-red-700" : "text-neutral-900"} note="somando todos os meses" />
      </div>

      {data.elsewhere.length > 0 ? (
        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-medium text-neutral-900">
            <span aria-hidden className="h-3 w-5 rounded-sm" style={FALTA_ESTILO} />
            Ficou pra trás
          </h2>
          <p className="mb-2 text-base text-neutral-600">Entregas de outros meses que ainda não foram pagas</p>
          <ul className="divide-y divide-neutral-100">
            {data.elsewhere.map((row) => (
              <li key={`${row.clientId}${row.month}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1 basis-40 text-base text-neutral-900">
                  {row.clientName}<span className="text-neutral-600"> · {mesNome(row.month)}</span>
                </span>
                <span className={`text-base font-medium tabular-nums ${row.overdue ? "text-red-700" : "text-neutral-900"}`}>
                  {formatBRL(row.cents)}{row.overdue ? " (atrasado)" : ""}
                </span>
                <Link href={href("contas", row.month)} className={`inline-flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white px-4 text-base hover:bg-neutral-50 ${FOCO}`}>
                  Abrir {mesNome(row.month)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-lg text-neutral-600">
          Nenhuma entrega com valor em {nome}. Quando um trabalho for para a coluna de pagamento no quadro de{" "}
          <Link href="/admin/entregas" className="underline">Entregas</Link>, ele aparece aqui.
        </p>
      ) : (
        <DinheiroClientes clients={data.clients} mes={month} mesNome={nome} />
      )}
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; base?: string }>;
}) {
  const { scope, month, thisMonth, nome, mesNome } = await lerParametros(searchParams);
  return (
    <>
      <ContasAba scope={scope} month={month} thisMonth={thisMonth} nome={nome} mesNome={mesNome} />
    </>
  );
}
