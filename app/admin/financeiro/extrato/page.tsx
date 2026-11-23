import Link from "next/link";
import { SaidaLinha } from "@/components/admin/SaidasForm";
import { CARTAO, Dado, FOCO, Vazio } from "@/components/admin/financeiro/ui";
import { LancarSaida } from "@/components/admin/SaidasForm";
import { EntradaLinha } from "@/components/admin/financeiro/EntradaLinha";
import { listClientOptions } from "@/lib/caixa";
import { formatBRL, nextMonthKey } from "@/lib/billingTypes";
import { getReceived } from "@/lib/dinheiro";
import { diaPorExtenso } from "@/lib/dinheiroTexto";
import { listExpenses } from "@/lib/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expensesTypes";
import { SetaMes, href, lerParametros, shiftMonth } from "../_comum";
export const dynamic = "force-dynamic";

const FILTROS = [
  ["tudo", "Tudo"],
  ["entradas", "Entradas"],
  ["saidas", "Saídas"],
  ["apagar", "A pagar"],
] as const;
type Filtro = (typeof FILTROS)[number][0];

export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string; tipo?: string; q?: string }> }) {
  const { tipo: tipoBruto, q = "" } = await searchParams;
  const { scope, month, thisMonth, nome } = await lerParametros(searchParams);
  if (scope !== null) {
    return <Vazio>O extrato do estúdio só aparece para quem tem acesso a todos os clientes.</Vazio>;
  }
  const tipo: Filtro = FILTROS.some(([id]) => id === tipoBruto) ? (tipoBruto as Filtro) : "tudo";
  const [recebido, saidas, clientes] = await Promise.all([
    getReceived(month, nextMonthKey(month), null),
    listExpenses(month),
    listClientOptions(),
  ]);

  const busca = q.trim().toLowerCase();
  const bate = (...textos: (string | null | undefined)[]) => !busca || textos.some((t) => (t ?? "").toLowerCase().includes(busca));
  const entradas = tipo === "saidas" || tipo === "apagar" ? [] : recebido.filter((r) => bate(r.name, r.title));
  const lista = tipo === "entradas" ? [] : saidas.filter((e) => (tipo !== "apagar" || !e.paid) && bate(e.description, e.clientName, EXPENSE_CATEGORY_LABELS[e.category]));

  const totalEntradas = entradas.reduce((s, r) => s + r.cents, 0);
  const totalSaidas = lista.reduce((s, e) => s + e.amountCents, 0);
  const porTipo = new Map<string, number>();
  for (const e of lista) porTipo.set(e.category, (porTipo.get(e.category) ?? 0) + e.amountCents);
  const categorias = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
  const topo = categorias[0]?.[1] ?? 1;
  const paraArrumar = saidas.filter((e) => e.category === "outros" || !e.description.trim());

  // Um bloco por dia, do mais recente para o mais antigo.
  const dias = new Map<string, { entradas: typeof entradas; saidas: typeof lista }>();
  const dia = (d: string) => dias.get(d) ?? dias.set(d, { entradas: [], saidas: [] }).get(d)!;
  for (const r of entradas) dia(r.date).entradas.push(r);
  for (const e of lista) dia(e.spentOn).saidas.push(e);
  const ordem = [...dias.keys()].sort((a, b) => b.localeCompare(a));

  const link = (t: Filtro) => `${href("extrato", month)}${href("extrato", month).includes("?") ? "&" : "?"}tipo=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SetaMes href={href("extrato", shiftMonth(month, -1))} lado="anterior" />
        <div className="text-center">
          <h2 className="text-xl font-medium text-neutral-900 first-letter:uppercase">{nome}</h2>
          <p className="min-h-6 text-base text-neutral-600">
            {month !== thisMonth ? <Link href={href("extrato")} className="underline">Voltar para este mês</Link> : null}
          </p>
        </div>
        <SetaMes href={href("extrato", shiftMonth(month, 1))} lado="proximo" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filtrar" className="flex rounded-lg border border-neutral-300 bg-white p-1">
          {FILTROS.map(([id, rotulo]) => (
            <Link
              key={id}
              href={link(id)}
              aria-current={tipo === id ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-base ${FOCO} ${tipo === id ? "bg-(--tatu-ink) font-medium text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              {rotulo}
            </Link>
          ))}
        </div>
        <form action="/admin/financeiro/extrato" className="flex min-w-0 flex-1 basis-56 gap-2">
          <input type="hidden" name="mes" value={month.slice(0, 7)} />
          <input type="hidden" name="tipo" value={tipo} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar lançamento"
            aria-label="Buscar lançamento"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none"
          />
        </form>
        <LancarSaida today={thisMonth === month ? new Date().toLocaleDateString("sv-SE") : month} clientes={clientes} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <div>
          {ordem.length === 0 ? (
            <Vazio>Nada {busca ? "encontrado" : "lançado"} em {nome}.</Vazio>
          ) : (
            ordem.map((d) => (
              <section key={d} className="mb-4" aria-label={diaPorExtenso(d)}>
                <h3 className="mb-1 text-sm font-medium text-neutral-600">{diaPorExtenso(d)}</h3>
                <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
                  {dias.get(d)!.entradas.map((r) => (
                    <EntradaLinha key={r.cardId} entrada={r} />
                  ))}
                  {dias.get(d)!.saidas.map((e) => (
                    <SaidaLinha key={`${e.id}${e.spentOn}`} expense={e} month={month} monthName={nome} clientes={clientes} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <section className={CARTAO}>
            <h2 className="text-lg font-medium text-neutral-900">Total da lista</h2>
            <div className="mt-2 grid gap-3">
              <Dado label="Entradas" cents={totalEntradas} tom="text-(--tatu-ink)" />
              <Dado label="Saídas" cents={totalSaidas} />
              <Dado label="Saldo" cents={totalEntradas - totalSaidas} tom={totalEntradas - totalSaidas < 0 ? "text-red-700" : ""} />
            </div>
          </section>
          <section className={CARTAO}>
            <h2 className="text-lg font-medium text-neutral-900">Para arrumar</h2>
            <p className="mt-1 text-base text-neutral-600">
              {paraArrumar.length === 0
                ? "Tudo classificado."
                : `${paraArrumar.length} ${paraArrumar.length === 1 ? "saída está" : "saídas estão"} em Outros ou sem descrição. Toque em Editar na linha e escolha o tipo.`}
            </p>
          </section>
          {categorias.length > 0 ? (
            <section className={CARTAO}>
              <h2 className="text-lg font-medium text-neutral-900">Saídas por tipo</h2>
              <ul className="mt-2 grid gap-3">
                {categorias.map(([cat, cents]) => (
                  <li key={cat}>
                    <div className="flex items-baseline justify-between gap-3 text-base">
                      <span className="min-w-0 truncate text-neutral-900">{EXPENSE_CATEGORY_LABELS[cat as keyof typeof EXPENSE_CATEGORY_LABELS]}</span>
                      <span className="tabular-nums text-neutral-900">{formatBRL(cents)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
                      <div className="h-1.5 rounded-full bg-(--tatu-ink)" style={{ width: `${Math.round((cents / topo) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
