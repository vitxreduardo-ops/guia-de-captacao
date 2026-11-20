import Link from "next/link";
import { getMoneyMonth, getMoneyYear } from "@/lib/dinheiro";
import { formatBRL, monthLabel } from "@/lib/billingTypes";
import { FALTA_ESTILO, FOCO, MES_CURTO, Numero, Secao, comparar, href, lerParametros, shiftMonth, SetaMes } from "../_comum";
export const dynamic = "force-dynamic";

async function ResultadoAba({
  scope, month, year, nome, base, mesNome,
}: {
  scope: string[] | null; month: string; year: number; nome: string;
  base: "trabalho" | "pagamento"; mesNome: (m: string) => string;
}) {
  const prev = shiftMonth(month, -1);
  const prevYear = Number(prev.slice(0, 4));
  const [yearMonths, prevYearMonths, data] = await Promise.all([
    getMoneyYear(year, scope, base),
    prevYear === year ? null : getMoneyYear(prevYear, scope, base),
    getMoneyMonth(month, scope),
  ]);
  const idx = (m: string) => Number(m.slice(5, 7)) - 1;
  const nowSlot = yearMonths[idx(month)];
  const prevSlot = (prevYearMonths ?? yearMonths)[idx(prev)];
  const yearPaid = yearMonths.reduce((s, m) => s + m.paidCents, 0);
  const yearOpen = yearMonths.reduce((s, m) => s + m.openCents, 0);
  const comMovimento = yearMonths.filter((m) => m.paidCents > 0).length;
  const tallest = Math.max(1, ...yearMonths.map((m) => m.paidCents + m.openCents));
  const ranking = data.clients
    .map((c) => ({ id: c.id, name: c.name, cents: c.paidCents + c.openCents }))
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  const topo = ranking[0]?.cents ?? 1;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SetaMes href={href("resultado", prev, base)} lado="anterior" />
          <h2 className="min-w-36 text-center text-xl font-medium text-neutral-900 first-letter:uppercase">{nome}</h2>
          <SetaMes href={href("resultado", shiftMonth(month, 1), base)} lado="proximo" />
        </div>

        <div role="group" aria-label="Como contar" className="flex rounded-lg border border-neutral-300 bg-white p-1">
          {([["trabalho", "Pelo mês do trabalho"], ["pagamento", "Pelo dia do pagamento"]] as const).map(([id, label]) => (
            <Link
              key={id}
              href={href("resultado", month, id)}
              aria-current={base === id ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-base ${FOCO} ${base === id ? "bg-(--tatu-ink) text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <p className="mb-5 text-sm text-neutral-500">
        {base === "trabalho"
          ? "Cada entrega conta no mês em que foi feita, mesmo que o cliente pague depois."
          : "Cada real conta no mês em que o dinheiro entrou, sem importar quando o trabalho foi feito."}
      </p>

      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <Numero label={`Entrou em ${mesNome(month)}`} value={nowSlot.paidCents} note={comparar(nowSlot.paidCents, prevSlot.paidCents, `${mesNome(prev)}`)} />
        {base === "trabalho" ? <Numero label="Em aberto" value={nowSlot.openCents} note="a receber + atrasado" /> : null}
        <Numero label={`Entrou em ${year}`} value={yearPaid} note={comMovimento > 0 ? `média de ${formatBRL(Math.round(yearPaid / comMovimento))} por mês` : undefined} />
      </div>

      <Secao titulo={`O ano de ${year}`} dica={yearOpen > 0 && base === "trabalho" ? `Em aberto: ${formatBRL(yearOpen)}. Toque num mês para abrir.` : "Toque num mês para abrir."}>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          {/* Cor sozinha não basta: o que falta entrar tem listras, e cada mês
              tem um rótulo falado com os valores, para leitor de tela. */}
          <p className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm bg-(--tatu-olive)" /> Já entrou
            </span>
            {base === "trabalho" ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-sm" style={FALTA_ESTILO} /> Em aberto
              </span>
            ) : null}
          </p>
          <ol className="grid grid-cols-12 items-end gap-1.5">
            {yearMonths.map((m, i) => {
              const key = `${year}-${String(i + 1).padStart(2, "0")}-01`;
              const current = key === month;
              return (
                <li key={key}>
                  <Link
                    href={href("resultado", key, base)}
                    title={`${monthLabel(key)}: entrou ${formatBRL(m.paidCents)}${base === "trabalho" ? `, em aberto ${formatBRL(m.openCents)}` : ""}`}
                    aria-label={`${monthLabel(key)}: entrou ${formatBRL(m.paidCents)}${base === "trabalho" ? `, em aberto ${formatBRL(m.openCents)}` : ""}`}
                    aria-current={current ? "page" : undefined}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1 ${FOCO} ${current ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
                  >
                    <span className="flex h-24 w-full flex-col justify-end">
                      <span className="w-full rounded-t" style={{ ...FALTA_ESTILO, height: `${(m.openCents / tallest) * 100}%` }} />
                      <span className={`w-full ${current ? "bg-(--tatu-ink)" : "bg-(--tatu-olive)"} ${m.openCents === 0 ? "rounded-t" : ""}`} style={{ height: `${(m.paidCents / tallest) * 100}%` }} />
                    </span>
                    <span className={`text-xs sm:text-sm ${current ? "font-medium text-neutral-900" : "text-neutral-600"}`}>{MES_CURTO[i]}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </Secao>

      {ranking.length > 0 ? (
        <Secao titulo={`Por cliente em ${mesNome(month)}`} dica="Trabalhos do mês, pagos e em aberto.">
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {ranking.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 text-base">
                  <span className="min-w-0 truncate text-neutral-900">{c.name}</span>
                  <span className="font-medium text-neutral-900 tabular-nums">{formatBRL(c.cents)}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100">
                  <div className="h-1.5 rounded-full bg-neutral-800" style={{ width: `${Math.round((c.cents / topo) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; base?: string }>;
}) {
  const { scope, month, year, nome, base, mesNome } = await lerParametros(searchParams);
  return (
    <>
      <ResultadoAba scope={scope} month={month} year={year} nome={nome} base={base} mesNome={mesNome} />
    </>
  );
}
