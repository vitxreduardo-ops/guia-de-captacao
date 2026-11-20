import Link from "next/link";
import { EntradasLinha } from "@/components/admin/EntradasLinha";
import { getMoneyMonth, getMoneyYear, getPaidByClient, getTodayView, type TodayRow } from "@/lib/dinheiro";
import { formatBRL, monthLabel } from "@/lib/billingTypes";
import { getExpenseYear, listExpensesByMonth } from "@/lib/expenses";
import { quando } from "@/lib/dinheiroTexto";
import { FOCO, MES_CURTO, Numero, comparar, href, lerParametros, shiftMonth, SetaMes } from "./_comum";
export const dynamic = "force-dynamic";

async function PainelAba({
  scope, month, thisMonth, nome, mesNome,
}: {
  scope: string[] | null; month: string; thisMonth: string; nome: string; mesNome: (m: string) => string;
}) {
  const prev = shiftMonth(month, -1);
  const start = shiftMonth(month, -8);
  const years = [...new Set([Number(start.slice(0, 4)), Number(month.slice(0, 4))])];
  // Despesa é do estúdio todo: só aparece pra quem vê todos os clientes.
  const verSaidas = scope === null;
  const monthsShown = Array.from({ length: 9 }, (_, i) => shiftMonth(month, i - 8));
  const [data, today, quem, gastos, ...series] = await Promise.all([
    getMoneyMonth(month, scope),
    getTodayView(scope),
    getPaidByClient(monthsShown, scope),
    verSaidas ? listExpensesByMonth(monthsShown) : Promise.resolve({} as Record<string, never[]>),
    // Entrou é caixa: o mês em que o dinheiro entrou, não o do trabalho.
    ...years.map((y) => getMoneyYear(y, scope, "pagamento")),
    ...(verSaidas ? years.map((y) => getExpenseYear(y)) : []),
  ]);
  const expSeries = verSaidas ? (series.splice(years.length) as unknown as number[][]) : [];
  const expByYear = new Map(years.map((y, i) => [y, expSeries[i]]));
  const spent = (m: string) => expByYear.get(Number(m.slice(0, 4)))?.[Number(m.slice(5, 7)) - 1] ?? 0;
  const byYear = new Map(years.map((y, i) => [y, series[i] as { paidCents: number; openCents: number }[]]));
  const slot = (m: string) => byYear.get(Number(m.slice(0, 4)))?.[Number(m.slice(5, 7)) - 1];

  const points = Array.from({ length: 9 }, (_, i) => {
    const m = shiftMonth(month, i - 8);
    return {
      label: MES_CURTO[Number(m.slice(5, 7)) - 1],
      title: monthLabel(m),
      cents: slot(m)?.paidCents ?? 0,
      clientes: quem[m] ?? [],
      saidas: (gastos[m] ?? []).map((e) => ({ name: e.description || "Sem descrição", cents: e.amountCents })),
    };
  });
  const entrou = slot(month)?.paidCents ?? 0;
  const entrouAntes = slot(prev)?.paidCents ?? 0;
  const saiu = spent(month);
  const saiuAntes = spent(prev);
  const sobrou = entrou - saiu;
  const sobrouAntes = entrouAntes - saiuAntes;
  const saidasPontos = Array.from({ length: 9 }, (_, i) => spent(shiftMonth(month, i - 8)));

  const atrasados = new Set([
    ...data.clients.filter((c) => c.status === "atrasado").map((c) => c.id),
    ...data.elsewhere.filter((r) => r.overdue).map((r) => r.clientId),
  ]);
  const comMovimento = new Set([...data.clients.map((c) => c.id), ...data.elsewhere.map((r) => r.clientId)]);
  const emDia = comMovimento.size > 0 ? Math.round(((comMovimento.size - atrasados.size) / comMovimento.size) * 100) : 100;
  const sum = (rows: TodayRow[]) => rows.reduce((s, r) => s + r.cents, 0);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <SetaMes href={href("painel", shiftMonth(month, -1))} lado="anterior" />
        <div className="text-center">
          <h2 className="text-xl font-medium text-neutral-900 first-letter:uppercase">{nome}</h2>
          {month !== thisMonth ? <Link href={href("painel")} className="text-base text-neutral-600 underline">Voltar para este mês</Link> : null}
        </div>
        <SetaMes href={href("painel", shiftMonth(month, 1))} lado="proximo" />
      </div>

      {/* O número do mês: o que sobrou (ou, sem acesso às saídas, o que entrou). */}
      <section className="mb-4 grid gap-x-8 gap-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-[1.5fr_1fr_1fr] sm:items-end">
        <div className="min-w-0">
          <p className="text-sm text-neutral-600">{verSaidas ? `Sobrou em ${mesNome(month)}` : `Entrou em ${mesNome(month)}`}</p>
          <p className={`text-4xl font-medium tabular-nums ${(verSaidas ? sobrou : entrou) < 0 ? "text-red-700" : "text-(--tatu-ink)"}`}>
            {formatBRL(verSaidas ? sobrou : entrou)}
          </p>
          <p className="text-sm text-neutral-500">{verSaidas ? comparar(sobrou, sobrouAntes, mesNome(prev)) : comparar(entrou, entrouAntes, mesNome(prev))}</p>
        </div>
        {verSaidas ? (
          <>
            <Numero label="Entrou" value={entrou} note={comparar(entrou, entrouAntes, mesNome(prev))} />
            <Numero label="Saiu" value={saiu} note={comparar(saiu, saiuAntes, mesNome(prev))} />
          </>
        ) : null}
      </section>

      <div className="mb-6 grid gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-3">
        <Numero label="A receber" value={data.openCents - data.monthOverdueCents} note={`de trabalhos de ${mesNome(month)}, no prazo`} />
        <Numero label="Atrasado" value={data.overdueCents} tone={data.overdueCents ? "text-red-700" : "text-neutral-900"} note={atrasados.size ? `${atrasados.size} ${atrasados.size === 1 ? "cliente" : "clientes"}, todos os meses` : "nada atrasado"} />
        <Numero label="Clientes em dia" value={emDia} unit="%" note={`${comMovimento.size - atrasados.size} de ${comMovimento.size}`} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-lg font-medium text-neutral-900">{verSaidas ? "Entrou e saiu, mês a mês" : "Entrou mês a mês"}</h2>
          <p className="mb-3 text-base text-neutral-600">Últimos 9 meses, pelo dia do pagamento</p>
          <EntradasLinha points={points} saidas={verSaidas ? saidasPontos : undefined} />
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-medium text-neutral-900">Avisos</h2>
          {today.late.length === 0 && today.upcoming.length === 0 ? (
            <p className="mt-2 text-base text-neutral-600">Nada atrasado nem vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-100">
              {[...today.late.slice(0, 3).map((r) => ({ r, late: true })), ...today.upcoming.slice(0, 3).map((r) => ({ r, late: false }))].map(({ r, late }) => (
                <li key={`${r.clientId}${r.month}${late}`} className="py-2.5">
                  <p className="flex items-baseline justify-between gap-2 text-base text-neutral-900">
                    <span className="min-w-0 truncate">{r.name}</span>
                    <span className="tabular-nums">{formatBRL(r.cents)}</span>
                  </p>
                  <p className={`text-sm ${late ? "text-red-700" : "text-neutral-500"}`}>
                    {late ? "atrasado" : "vence"} {r.date ? quando(r.date) : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href={href("hoje")} className={`mt-2 inline-flex min-h-11 items-center rounded-lg text-base text-neutral-600 underline hover:text-neutral-900 ${FOCO}`}>
            Ver todas as cobranças ({formatBRL(sum(today.late) + sum(today.upcoming))})
          </Link>
        </section>
      </div>
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
      <PainelAba scope={scope} month={month} thisMonth={thisMonth} nome={nome} mesNome={mesNome} />
    </>
  );
}
