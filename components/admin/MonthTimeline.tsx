import Link from "next/link";
import { monthLabel } from "@/lib/billingTypes";

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * Linha do tempo dos meses. Cada mês é um link — o estado continua na URL, que
 * é o que torna o endereço colável, e trocar de mês passa a ser um toque em vez
 * de abrir uma lista de doze itens e apertar "Ver".
 *
 * Os meses vêm do mais antigo para o mais recente, ao contrário da lista do
 * seletor: linha do tempo que anda para trás confunde.
 */
export function MonthTimeline({
  months,
  current,
  clientId,
}: {
  months: string[];
  current: string;
  clientId: string;
}) {
  const ordered = [...months].reverse();

  return (
    <nav
      aria-label="Meses"
      className="flex items-stretch gap-1 overflow-x-auto pb-1 [scrollbar-width:none]"
    >
      {ordered.map((month, index) => {
        const year = month.slice(0, 4);
        // O ano aparece só quando vira: doze "2026" em sequência viram ruído.
        const showYear = index === 0 || year !== ordered[index - 1].slice(0, 4);
        const selected = month === current;

        return (
          <Link
            key={month}
            href={`/admin/clientes/faturamento?cliente=${clientId}&mes=${month}`}
            aria-current={selected ? "page" : undefined}
            aria-label={monthLabel(month)}
            className={`flex shrink-0 flex-col items-center rounded-md px-3 py-1.5 text-sm transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11 ${
              selected
                ? "bg-neutral-900 font-medium text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <span>{MONTH_SHORT[Number(month.slice(5, 7)) - 1]}</span>
            <span
              className={`text-[10px] tabular-nums ${
                selected ? "text-neutral-300" : "text-neutral-400"
              }`}
            >
              {showYear || selected ? year : " "}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
