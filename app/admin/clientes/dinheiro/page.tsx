import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Accordion } from "@/components/Accordion";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { DinheiroClientes } from "@/components/admin/DinheiroClientes";
import { EntradasLinha } from "@/components/admin/EntradasLinha";
import { SaidaLinha, SaidasForm } from "@/components/admin/SaidasForm";
import { ServiceCatalog } from "@/components/admin/ServiceCatalog";
import { listServices } from "@/lib/billing";
import {
  getMoneyMonth,
  getMoneyYear,
  getPaidByClient,
  getTodayView,
  type TodayRow,
} from "@/lib/dinheiro";
import { formatBRL, monthKey, monthLabel } from "@/lib/billingTypes";
import { getExpenseYear, listExpenses, listExpensesByMonth } from "@/lib/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expensesTypes";
import { quando } from "@/lib/dinheiroTexto";
import { CobrarLink, ContaSelect } from "@/components/admin/ContaPix";
import { getCurrentClientScope } from "@/lib/clientAccess";

export const dynamic = "force-dynamic";

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

type Aba = "painel" | "hoje" | "contas" | "resultado" | "saidas";
const ABAS: { id: Aba; label: string; dica: string }[] = [
  { id: "painel", label: "Painel", dica: "O retrato do mês em uma tela" },
  { id: "hoje", label: "Cobranças", dica: "O que pede sua atenção agora" },
  { id: "contas", label: "Contas", dica: "Cada cliente, mês a mês, para marcar o que foi pago" },
  { id: "resultado", label: "Entradas", dica: "Quanto entrou de dinheiro no mês e no ano" },
  { id: "saidas", label: "Saídas", dica: "O que saiu de dinheiro do estúdio" },
];

/** Amarelo listrado: o "ainda falta" se distingue do "já entrou" mesmo sem cor. */
const FALTA_ESTILO = {
  backgroundColor: "#fbbf24",
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 6px)",
} as const;

const FOCO =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

/** Soma meses sem passar pelo fuso: "2026-12-01" + 1 = "2027-01-01". */
function shiftMonth(month: string, delta: number): string {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

function href(aba: Aba, month?: string, base?: string) {
  const q = new URLSearchParams({ aba });
  if (month) q.set("mes", month.slice(0, 7));
  if (base) q.set("base", base);
  return `/admin/clientes/dinheiro?${q}`;
}

function Numero({
  label,
  value,
  note,
  tone = "text-neutral-900",
}: {
  label: string;
  value: number;
  note?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 flex-1 basis-40">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${tone}`}>{formatBRL(value)}</p>
      {note ? <p className="text-sm text-neutral-500">{note}</p> : null}
    </div>
  );
}

function comparar(atual: number, anterior: number, nomeAnterior: string): string {
  const d = atual - anterior;
  if (d === 0) return `igual a ${nomeAnterior}`;
  return `${formatBRL(Math.abs(d))} a ${d > 0 ? "mais" : "menos"} que ${nomeAnterior}`;
}

function Secao({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-neutral-900">{titulo}</h2>
      {dica ? <p className="mb-2 text-base text-neutral-600">{dica}</p> : <div className="mb-2" />}
      {children}
    </section>
  );
}

function ListaHoje({ rows, mostrarCobrar }: { rows: TodayRow[]; mostrarCobrar?: boolean }) {
  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
      {rows.map((row) => {
        return (
          <li key={`${row.clientId}${row.month}${row.date}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-0 flex-1 basis-44">
              <p className="text-base font-medium text-neutral-900">{row.name}</p>
              <p className="text-sm text-neutral-500">
                {mostrarCobrar === undefined ? "recebido " : `de ${monthLabel(row.month)} · `}
                {row.date ? quando(row.date) : "sem dia combinado"}
              </p>
            </div>
            <span className="text-base font-medium text-neutral-900 tabular-nums">{formatBRL(row.cents)}</span>
            {mostrarCobrar ? (
              <CobrarLink
                cliente={row}
                mesNome={monthLabel(row.month)}
                cents={row.cents}
                rotulo="Cobrar"
                ariaLabel={`Cobrar ${row.name} no WhatsApp`}
                className={`inline-flex min-h-11 items-center rounded-lg border border-neutral-300 px-4 text-base hover:bg-neutral-50 ${FOCO}`}
              />
            ) : null}
            {mostrarCobrar !== undefined ? (
              <Link
                href={href("contas", row.month)}
                aria-label={`Abrir ${monthLabel(row.month)} de ${row.name}`}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-base text-neutral-600 underline hover:text-neutral-900 ${FOCO}`}
              >
                Abrir
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default async function DinheiroPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; mes?: string; base?: string }>;
}) {
  const params = await searchParams;
  const scope = await getCurrentClientScope();
  const aba: Aba = ABAS.some((a) => a.id === params.aba) ? (params.aba as Aba) : "hoje";
  const thisMonth = monthKey(new Date());
  const month = params.mes && /^\d{4}-(0[1-9]|1[0-2])/.test(params.mes) ? monthKey(params.mes) : thisMonth;
  const base = params.base === "pagamento" ? "pagamento" : "trabalho";
  const year = Number(month.slice(0, 4));
  const nome = monthLabel(month);
  const mesCurto = (m: string) => MES_CURTO[Number(m.slice(5, 7)) - 1];

  return (
    <div className="mx-auto w-full max-w-4xl pb-12">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Dinheiro" },
        ]}
      />

      <div className="mb-4">
        <ClientTabs current={`/admin/clientes/dinheiro?aba=${aba}`} />
      </div>

      <p className="mb-5 text-base text-neutral-600">{ABAS.find((a) => a.id === aba)?.dica}</p>

      {aba === "painel" ? (
        <PainelAba scope={scope} month={month} thisMonth={thisMonth} nome={nome} mesCurto={mesCurto} />
      ) : null}
      {aba === "saidas" ? <SaidasAba scope={scope} month={month} thisMonth={thisMonth} nome={nome} mesCurto={mesCurto} /> : null}
      {aba === "hoje" ? <HojeAba scope={scope} /> : null}
      {aba === "contas" ? <ContasAba scope={scope} month={month} thisMonth={thisMonth} nome={nome} mesCurto={mesCurto} /> : null}
      {aba === "resultado" ? (
        <ResultadoAba scope={scope} month={month} year={year} nome={nome} base={base} mesCurto={mesCurto} />
      ) : null}
    </div>
  );
}

async function HojeAba({ scope }: { scope: string[] | null }) {
  const v = await getTodayView(scope);
  const sum = (rows: TodayRow[]) => rows.reduce((s, r) => s + r.cents, 0);
  const tudoEmDia = v.late.length === 0 && v.upcoming.length === 0 && v.noDay.length === 0;

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-4">
        <Numero label="Atrasado" value={sum(v.late)} tone={v.late.length ? "text-red-700" : "text-neutral-600"} note={v.late.length ? `${v.late.length} ${v.late.length === 1 ? "cobrança" : "cobranças"}` : "nada atrasado"} />
        <Numero label="Vence em 7 dias" value={sum(v.upcoming)} />
        <Numero label="Entrou em 7 dias" value={sum(v.received)} tone="text-emerald-700" />
      </div>

      {v.late.length + v.upcoming.length + v.noDay.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label htmlFor="conta-cobranca" className="text-base text-neutral-700">
            Chave Pix que vai na mensagem de cobrança:
          </label>
          <ContaSelect id="conta-cobranca" ariaLabel="Conta que recebe o Pix" />
        </div>
      ) : null}

      {tudoEmDia && v.received.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-lg text-neutral-600">
          Nada pendente por aqui. Quando um trabalho for para a coluna de pagamento no quadro de Entregas, ele aparece.
        </p>
      ) : null}

      {v.late.length > 0 ? (
        <Secao titulo="Atrasado" dica="Passou do dia combinado. Toque em Cobrar para abrir o WhatsApp já com a mensagem.">
          <ListaHoje rows={v.late} mostrarCobrar />
        </Secao>
      ) : null}
      {v.upcoming.length > 0 ? (
        <Secao titulo="A receber nos próximos 7 dias">
          <ListaHoje rows={v.upcoming} mostrarCobrar />
        </Secao>
      ) : null}
      {v.noDay.length > 0 ? (
        <Secao titulo="Sem dia combinado" dica="Esses clientes não têm dia de pagamento cadastrado, então nunca aparecem como atrasados.">
          <ListaHoje rows={v.noDay} mostrarCobrar />
        </Secao>
      ) : null}
      {v.received.length > 0 ? (
        <Secao titulo="Entrou nos últimos 7 dias">
          <ListaHoje rows={v.received} />
        </Secao>
      ) : null}
    </>
  );
}

async function ContasAba({
  scope, month, thisMonth, nome, mesCurto,
}: {
  scope: string[] | null; month: string; thisMonth: string; nome: string; mesCurto: (m: string) => string;
}) {
  const [data, services] = await Promise.all([getMoneyMonth(month, scope), listServices()]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href={href("contas", shiftMonth(month, -1))} aria-label="Mês anterior" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>←</Link>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900 first-letter:uppercase">{nome}</h2>
          {month !== thisMonth ? (
            <Link href={href("contas")} className="text-base text-neutral-600 underline">Voltar para este mês</Link>
          ) : null}
        </div>
        <Link href={href("contas", shiftMonth(month, 1))} aria-label="Próximo mês" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>→</Link>
      </div>

      <p className="mb-3 text-base text-neutral-600">
        O cliente paga no mês seguinte ao do trabalho, no dia combinado. Por isso o
        que foi feito em {nome} vence em {monthLabel(shiftMonth(month, 1))}.
        Se o combinado foi outro, toque em Editar na entrega, ou em Mudar vencimento no cliente.
      </p>

      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-4">
        <Numero label="Já recebido" value={data.paidCents} tone="text-emerald-700" />
        <Numero label="Falta receber" value={data.openCents} tone="text-amber-700" />
        <Numero label="Atrasado" value={data.overdueCents} tone={data.overdueCents ? "text-red-700" : "text-neutral-600"} note="somando todos os meses" />
      </div>

      {data.elsewhere.length > 0 ? (
        <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold text-neutral-900">Ficou pra trás</h2>
          <p className="mb-2 text-base text-neutral-700">Entregas de outros meses que ainda não foram pagas.</p>
          <ul className="divide-y divide-amber-200">
            {data.elsewhere.map((row) => (
              <li key={`${row.clientId}${row.month}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1 basis-40 text-base text-neutral-900">
                  {row.clientName}<span className="text-neutral-600"> · {monthLabel(row.month)}</span>
                </span>
                <span className={`text-base font-medium tabular-nums ${row.overdue ? "text-red-700" : "text-neutral-900"}`}>
                  {formatBRL(row.cents)}{row.overdue ? " (atrasado)" : ""}
                </span>
                <Link href={href("contas", row.month)} className={`inline-flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white px-4 text-base hover:bg-neutral-50 ${FOCO}`}>
                  Abrir {mesCurto(row.month)}.
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-lg text-neutral-600">
          Nenhuma entrega com valor em {nome}. Quando um trabalho for para a coluna de pagamento no quadro de{" "}
          <Link href="/admin/clientes/entregas" className="underline">Entregas</Link>, ele aparece aqui.
        </p>
      ) : (
        <DinheiroClientes clients={data.clients} mes={month} mesNome={nome} />
      )}

      <Accordion
        summary={<span className="text-lg font-semibold text-neutral-900">Preços dos serviços</span>}
        className="mt-8 rounded-xl border border-neutral-200 bg-white"
        buttonClassName="p-4"
      >
        <div className="border-t border-neutral-100 p-4 pt-3">
          <ServiceCatalog services={services} />
        </div>
      </Accordion>
    </>
  );
}

async function ResultadoAba({
  scope, month, year, nome, base, mesCurto,
}: {
  scope: string[] | null; month: string; year: number; nome: string;
  base: "trabalho" | "pagamento"; mesCurto: (m: string) => string;
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
          <Link href={href("resultado", prev, base)} aria-label="Mês anterior" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>←</Link>
          <h2 className="min-w-36 text-center text-xl font-semibold text-neutral-900 first-letter:uppercase">{nome}</h2>
          <Link href={href("resultado", shiftMonth(month, 1), base)} aria-label="Próximo mês" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>→</Link>
        </div>

        <div role="group" aria-label="Como contar" className="flex rounded-lg border border-neutral-300 bg-white p-1">
          {([["trabalho", "Pelo mês do trabalho"], ["pagamento", "Pelo dia do pagamento"]] as const).map(([id, label]) => (
            <Link
              key={id}
              href={href("resultado", month, id)}
              aria-current={base === id ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-base ${FOCO} ${base === id ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
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

      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-4">
        <Numero label={`Entrou em ${mesCurto(month)}.`} value={nowSlot.paidCents} tone="text-emerald-700" note={comparar(nowSlot.paidCents, prevSlot.paidCents, `${mesCurto(prev)}.`)} />
        {base === "trabalho" ? <Numero label="Ainda falta receber" value={nowSlot.openCents} tone="text-amber-700" /> : null}
        <Numero label={`Em ${year}`} value={yearPaid} note={comMovimento > 0 ? `média de ${formatBRL(Math.round(yearPaid / comMovimento))} por mês` : undefined} />
      </div>

      <Secao titulo={`O ano de ${year}`} dica={yearOpen > 0 && base === "trabalho" ? `Ainda falta entrar ${formatBRL(yearOpen)}. Toque num mês para abrir.` : "Toque num mês para abrir."}>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          {/* Cor sozinha não basta: o que falta entrar tem listras, e cada mês
              tem um rótulo falado com os valores, para leitor de tela. */}
          <p className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm bg-emerald-500" /> Já entrou
            </span>
            {base === "trabalho" ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-sm" style={FALTA_ESTILO} /> Ainda falta
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
                    title={`${monthLabel(key)}: entrou ${formatBRL(m.paidCents)}${base === "trabalho" ? `, ainda falta ${formatBRL(m.openCents)}` : ""}`}
                    aria-label={`${monthLabel(key)}: entrou ${formatBRL(m.paidCents)}${base === "trabalho" ? `, ainda falta ${formatBRL(m.openCents)}` : ""}`}
                    aria-current={current ? "page" : undefined}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1 ${FOCO} ${current ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
                  >
                    <span className="flex h-24 w-full flex-col justify-end">
                      <span className="w-full rounded-t" style={{ ...FALTA_ESTILO, height: `${(m.openCents / tallest) * 100}%` }} />
                      <span className={`w-full bg-emerald-500 ${m.openCents === 0 ? "rounded-t" : ""}`} style={{ height: `${(m.paidCents / tallest) * 100}%` }} />
                    </span>
                    <span className={`text-xs sm:text-sm ${current ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>{MES_CURTO[i]}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </Secao>

      {ranking.length > 0 ? (
        <Secao titulo={`Por cliente em ${mesCurto(month)}.`}>
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

async function PainelAba({
  scope, month, thisMonth, nome, mesCurto,
}: {
  scope: string[] | null; month: string; thisMonth: string; nome: string; mesCurto: (m: string) => string;
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
    ...years.map((y) => getMoneyYear(y, scope)),
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
      label: mesCurto(m),
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
  const topo = Math.max(1, ...data.clients.map((c) => c.paidCents + c.openCents));

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href={href("painel", shiftMonth(month, -1))} aria-label="Mês anterior" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>←</Link>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900 first-letter:uppercase">{nome}</h2>
          {month !== thisMonth ? <Link href={href("painel")} className="text-base text-neutral-600 underline">Voltar para este mês</Link> : null}
        </div>
        <Link href={href("painel", shiftMonth(month, 1))} aria-label="Próximo mês" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>→</Link>
      </div>

      {verSaidas ? (
        <div className="mb-3 grid gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-3">
          <Numero label={`Sobrou em ${mesCurto(month)}.`} value={sobrou} tone={sobrou < 0 ? "text-red-700" : "text-neutral-900"} note={comparar(sobrou, sobrouAntes, `${mesCurto(prev)}.`)} />
          <Numero label="Entrou" value={entrou} tone="text-emerald-700" note={comparar(entrou, entrouAntes, `${mesCurto(prev)}.`)} />
          <Numero label="Saiu" value={saiu} note={comparar(saiu, saiuAntes, `${mesCurto(prev)}.`)} />
        </div>
      ) : null}

      <div className="mb-6 grid gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-3">
        {verSaidas ? null : <Numero label={`Entrou em ${mesCurto(month)}.`} value={entrou} tone="text-emerald-700" note={comparar(entrou, entrouAntes, `${mesCurto(prev)}.`)} />}
        <Numero label="Falta receber" value={data.openCents} tone="text-amber-700" />
        <Numero label="Atrasado" value={data.overdueCents} tone={data.overdueCents ? "text-red-700" : "text-neutral-600"} note={atrasados.size ? `${atrasados.size} ${atrasados.size === 1 ? "cliente" : "clientes"}` : "nada atrasado"} />
        <div className="min-w-0 flex-1 basis-40">
          <p className="text-sm text-neutral-600">Clientes em dia</p>
          <p className="text-xl font-semibold tabular-nums text-neutral-900">{emDia}%</p>
          <p className="text-sm text-neutral-500">{comMovimento.size - atrasados.size} de {comMovimento.size}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-neutral-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-neutral-900">{verSaidas ? "Entrou e saiu, mês a mês" : "Entrou mês a mês"}</h2>
          <p className="mb-3 text-base text-neutral-600">Os últimos 9 meses, até {nome}.</p>
          <EntradasLinha points={points} saidas={verSaidas ? saidasPontos : undefined} />
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-neutral-900">Avisos</h2>
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
          <Link href={href("hoje")} className={`mt-2 inline-flex min-h-11 items-center rounded-lg text-base text-neutral-700 underline hover:text-neutral-900 ${FOCO}`}>
            Ver todas as cobranças ({formatBRL(sum(today.late) + sum(today.upcoming))})
          </Link>
        </section>
      </div>

      {data.clients.length > 0 ? (
        <Secao titulo={`Quem pagou e quem deve em ${mesCurto(month)}.`}>
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {data.clients.map((c) => {
              const total = c.paidCents + c.openCents;
              return (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 text-base">
                    <span className="min-w-0 truncate text-neutral-900">{c.name}</span>
                    <span className="tabular-nums text-neutral-900">
                      {formatBRL(c.paidCents)} <span className="text-neutral-500">de {formatBRL(total)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-neutral-100" style={{ width: `${Math.max(8, Math.round((total / topo) * 100))}%` }}>
                    <span className="bg-emerald-500" style={{ width: `${(c.paidCents / total) * 100}%` }} />
                    <span style={{ ...FALTA_ESTILO, width: `${(c.openCents / total) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Secao>
      ) : null}
    </>
  );
}

async function SaidasAba({
  scope, month, thisMonth, nome, mesCurto,
}: {
  scope: string[] | null; month: string; thisMonth: string; nome: string; mesCurto: (m: string) => string;
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
        <Link href={href("saidas", shiftMonth(month, -1))} aria-label="Mês anterior" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>←</Link>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900 first-letter:uppercase">{nome}</h2>
          {month !== thisMonth ? <Link href={href("saidas")} className="text-base text-neutral-600 underline">Voltar para este mês</Link> : null}
        </div>
        <Link href={href("saidas", shiftMonth(month, 1))} aria-label="Próximo mês" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg hover:bg-neutral-50 ${FOCO}`}>→</Link>
      </div>

      <SaidasForm today={dataInicial} />

      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-4">
        <Numero label={`Saiu em ${mesCurto(month)}.`} value={total} note={comparar(total, totalAntes, `${mesCurto(prev)}.`)} />
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
