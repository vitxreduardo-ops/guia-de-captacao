import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatBRL, monthKey, monthLabel } from "@/lib/billingTypes";
import { quando } from "@/lib/dinheiroTexto";
import { CobrarLink } from "@/components/admin/ContaPix";
import { getCurrentClientScope } from "@/lib/clientAccess";
import type { TodayRow } from "@/lib/dinheiro";

export const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export type Aba = "painel" | "hoje" | "contas" | "resultado" | "saidas";

const CAMINHO: Record<Aba, string> = {
  painel: "/admin/financeiro",
  hoje: "/admin/financeiro/cobrancas",
  contas: "/admin/financeiro/contas",
  resultado: "/admin/financeiro/entradas",
  saidas: "/admin/financeiro/saidas",
};

/** Amarelo listrado: o "ainda falta" se distingue do "já entrou" mesmo sem cor. */
export const FALTA_ESTILO = {
  backgroundColor: "#fbbf24",
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 6px)",
} as const;

export const FOCO =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

/** Soma meses sem passar pelo fuso: "2026-12-01" + 1 = "2027-01-01". */
export function shiftMonth(month: string, delta: number): string {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

export function href(aba: Aba, month?: string, base?: string) {
  const q = new URLSearchParams();
  if (month) q.set("mes", month.slice(0, 7));
  if (base) q.set("base", base);
  const busca = q.toString();
  return busca ? `${CAMINHO[aba]}?${busca}` : CAMINHO[aba];
}

/** Mês por extenso; o ano só aparece quando não é o corrente. */
export function mesLongo(m: string): string {
  const [nome, ano] = monthLabel(m).split(" de ");
  return Number(ano) === new Date().getFullYear() ? nome : `${nome} de ${ano}`;
}

/** Seta de mês: um ícone de linha dentro do mesmo botão de 44 px de sempre. */
export function SetaMes({ href: destino, lado }: { href: string; lado: "anterior" | "proximo" }) {
  const Icone = lado === "anterior" ? ChevronLeft : ChevronRight;
  return (
    <Link
      href={destino}
      aria-label={lado === "anterior" ? "Mês anterior" : "Próximo mês"}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 ${FOCO}`}
    >
      <Icone className="size-5" strokeWidth={1.5} aria-hidden />
    </Link>
  );
}

export function Numero({
  label,
  value,
  note,
  tone = "text-neutral-900",
  unit,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: string;
  /** Sem unit, o valor é dinheiro em centavos; com unit (ex.: "%"), é o número como está. */
  unit?: string;
}) {
  return (
    <div className="min-w-0 flex-1 basis-40">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className={`text-xl font-medium tabular-nums ${tone}`}>{unit ? `${value}${unit}` : formatBRL(value)}</p>
      {note ? <p className="text-sm text-neutral-500">{note}</p> : null}
    </div>
  );
}

export function comparar(atual: number, anterior: number, nomeAnterior: string): string {
  const d = atual - anterior;
  if (d === 0) return `igual a ${nomeAnterior}`;
  return `${formatBRL(Math.abs(d))} a ${d > 0 ? "mais" : "menos"} que ${nomeAnterior}`;
}

export function Secao({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium text-neutral-900">{titulo}</h2>
      {dica ? <p className="mb-2 text-base text-neutral-600">{dica}</p> : <div className="mb-2" />}
      {children}
    </section>
  );
}

export function ListaHoje({ rows, mostrarCobrar }: { rows: TodayRow[]; mostrarCobrar?: boolean }) {
  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
      {rows.map((row) => {
        return (
          <li key={`${row.clientId}${row.month}${row.date}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <div className="min-w-0 flex-1 basis-44">
              <p className="text-base font-medium text-neutral-900">{row.name}</p>
              <p className="text-sm text-neutral-500">
                {mostrarCobrar === undefined ? "recebido " : `de ${mesLongo(row.month)} · `}
                {row.date ? quando(row.date) : "sem dia combinado"}
              </p>
            </div>
            <span className="text-base font-medium text-neutral-900 tabular-nums">{formatBRL(row.cents)}</span>
            {mostrarCobrar ? (
              <CobrarLink
                cliente={row}
                mesNome={mesLongo(row.month)}
                cents={row.cents}
                rotulo="Cobrar"
                ariaLabel={`Cobrar ${row.name} no WhatsApp`}
                className={`inline-flex min-h-11 items-center rounded-lg border border-neutral-300 px-4 text-base hover:bg-neutral-50 ${FOCO}`}
              />
            ) : null}
            {mostrarCobrar !== undefined ? (
              <Link
                href={href("contas", row.month)}
                aria-label={`Abrir ${mesLongo(row.month)} de ${row.name}`}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-base text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 ${FOCO}`}
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

/** O que toda aba do Financeiro precisa saber da URL: quem vê, que mês, que critério. */
export async function lerParametros(searchParams: Promise<{ mes?: string; base?: string }>) {
  const params = await searchParams;
  const scope = await getCurrentClientScope();
  const thisMonth = monthKey(new Date());
  const month = params.mes && /^\d{4}-(0[1-9]|1[0-2])/.test(params.mes) ? monthKey(params.mes) : thisMonth;
  const base: "trabalho" | "pagamento" = params.base === "pagamento" ? "pagamento" : "trabalho";
  const mesNome = mesLongo;
  return { scope, month, thisMonth, base, year: Number(month.slice(0, 4)), nome: monthLabel(month), mesNome };
}
