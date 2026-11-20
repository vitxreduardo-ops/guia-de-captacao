import Link from "next/link";
import { SaidaLinha, SaidasForm } from "@/components/admin/SaidasForm";
import { listExpenses } from "@/lib/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expensesTypes";
import { Numero, comparar, href, lerParametros, shiftMonth, SetaMes } from "../_comum";
export const dynamic = "force-dynamic";

async function SaidasAba({
  scope, month, thisMonth, nome, mesNome,
}: {
  scope: string[] | null; month: string; thisMonth: string; nome: string; mesNome: (m: string) => string;
}) {
  if (scope !== null) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-lg text-neutral-600">
        As saídas do estúdio só aparecem para quem tem acesso a todos os clientes.
      </p>
    );
  }
  const prev = shiftMonth(month, -1);
  const [list, prevList] = await Promise.all([listExpenses(month), listExpenses(prev)]);
  const total = list.reduce((s, e) => s + e.amountCents, 0);
  const totalAntes = prevList.reduce((s, e) => s + e.amountCents, 0);
  const porTipo = new Map<string, number>();
  for (const e of list) porTipo.set(e.category, (porTipo.get(e.category) ?? 0) + e.amountCents);
  const tipos = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
  const hoje = new Date().toLocaleDateString("sv-SE");
  const dataInicial = month === thisMonth ? hoje : month;

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <SetaMes href={href("saidas", shiftMonth(month, -1))} lado="anterior" />
        <div className="text-center">
          <h2 className="text-xl font-medium text-neutral-900 first-letter:uppercase">{nome}</h2>
          {month !== thisMonth ? <Link href={href("saidas")} className="text-base text-neutral-600 underline">Voltar para este mês</Link> : null}
        </div>
        <SetaMes href={href("saidas", shiftMonth(month, 1))} lado="proximo" />
      </div>

      <SaidasForm today={dataInicial} />

      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <Numero label={`Saiu em ${mesNome(month)}`} value={total} note={comparar(total, totalAntes, `${mesNome(prev)}`)} />
        {tipos.slice(0, 3).map(([tipo, cents]) => (
          <Numero key={tipo} label={EXPENSE_CATEGORY_LABELS[tipo as keyof typeof EXPENSE_CATEGORY_LABELS]} value={cents} />
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-lg text-neutral-600">
          Nenhuma saída lançada em {nome}. Use o formulário acima.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {list.map((e) => <SaidaLinha key={e.id} expense={e} month={month} monthName={nome} />)}
        </ul>
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
      <SaidasAba scope={scope} month={month} thisMonth={thisMonth} nome={nome} mesNome={mesNome} />
    </>
  );
}
