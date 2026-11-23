import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey, monthLabel } from "@/lib/billingTypes";
import { getCurrentClientScope } from "@/lib/clientAccess";

export const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export type Aba = "painel" | "pagar" | "projecao" | "analise" | "extrato" | "contas";

const CAMINHO: Record<Aba, string> = {
  painel: "/admin/financeiro",
  pagar: "/admin/financeiro/pagar-e-receber",
  projecao: "/admin/financeiro/projecao",
  analise: "/admin/financeiro/analise",
  extrato: "/admin/financeiro/extrato",
  contas: "/admin/financeiro/contas",
};

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
