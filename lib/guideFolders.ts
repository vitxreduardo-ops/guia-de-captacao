import type { Guide } from "@/lib/guides";

export const SEM_CLIENTE = "Sem cliente";

/** "2026-12-05" -> "05/12/2026" sem passar por Date (evita virar o dia no fuso). */
export function formatShootDate(value: string) {
  const [ano, mes, dia] = value.split("-");
  return `${dia}/${mes}/${ano}`;
}

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function monthKey(dateValue: string) {
  return dateValue.slice(0, 7); // "YYYY-MM"
}

export function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const label = MONTH_LABELS[Number(month) - 1] ?? month;
  return `${label}/${year}`;
}


export type GrupoMes = { chave: string; guias: Guide[] };
export type PastaCliente = {
  cliente: string;
  total: number;
  /** Próxima data de gravação a partir de hoje ("YYYY-MM-DD"), se houver. */
  proxima: string | null;
  meses: GrupoMes[];
};

/**
 * Pastas da home de guias: uma por cliente (texto do campo, sem diferenciar
 * espaço nas pontas), clientes em ordem alfabética e "Sem cliente" no fim.
 * Dentro, grupos por mês de gravação em ordem de data; "sem-data" por último.
 */
export function agruparPorCliente(guias: Guide[], hoje: string): PastaCliente[] {
  const porCliente = new Map<string, Guide[]>();
  for (const guia of guias) {
    const cliente = guia.client_name?.trim() || SEM_CLIENTE;
    porCliente.set(cliente, [...(porCliente.get(cliente) ?? []), guia]);
  }

  const pastas = [...porCliente].map(([cliente, lista]) => {
    const ordenados = [...lista].sort((a, b) => {
      if (a.shoot_date && b.shoot_date) return a.shoot_date.localeCompare(b.shoot_date);
      if (a.shoot_date) return -1;
      if (b.shoot_date) return 1;
      return b.created_at.localeCompare(a.created_at);
    });

    const meses: GrupoMes[] = [];
    for (const guia of ordenados) {
      const chave = guia.shoot_date ? guia.shoot_date.slice(0, 7) : "sem-data";
      const ultimo = meses.at(-1);
      if (ultimo?.chave === chave) ultimo.guias.push(guia);
      else meses.push({ chave, guias: [guia] });
    }

    const proxima =
      ordenados.find((g) => g.shoot_date && g.shoot_date >= hoje)?.shoot_date ?? null;

    return { cliente, total: lista.length, proxima, meses };
  });

  return pastas.sort((a, b) => {
    if (a.cliente === SEM_CLIENTE) return 1;
    if (b.cliente === SEM_CLIENTE) return -1;
    return a.cliente.localeCompare(b.cliente, "pt-BR");
  });
}
