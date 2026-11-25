// Contas do caixa: projeção, reserva e simulador. Sem "server-only" e sem
// banco: o simulador roda no navegador com a mesma conta da página.

export interface Entrada {
  /** Vencimento AAAA-MM-DD. Null = sem dia combinado: fica fora da projeção. */
  date: string | null;
  cents: number;
}

export interface Saida {
  date: string;
  cents: number;
}

export interface MesProjetado {
  /** AAAA-MM-01 */
  month: string;
  entra: number;
  sai: number;
  /** Caixa no fim do mês, já contando tudo que entra e sai até lá. */
  fim: number;
}

export interface Projecao {
  caixaHoje: number;
  meses: MesProjetado[];
  /** O ponto mais baixo entre hoje e o último mês. */
  menorCents: number;
  menorMes: string | null;
  /** A receber sem vencimento: não entra na conta, mas a tela avisa. */
  semDataCents: number;
}

/** "2026-12-01" + 1 = "2027-01-01", sem passar por fuso. */
export function somarMeses(month: string, delta: number): string {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

const mesDe = (iso: string) => `${iso.slice(0, 7)}-01`;

/**
 * Caixa mês a mês: começa no que há hoje e soma o que já está lançado.
 * Vencido entra no primeiro mês (é dinheiro que deveria ter mexido já);
 * o que passa do último mês fica de fora.
 */
export function projetar(args: {
  hoje: string;
  caixa: number;
  entradas: Entrada[];
  saidas: Saida[];
  meses?: number;
}): Projecao {
  const total = args.meses ?? 6;
  const primeiro = mesDe(args.hoje);
  const meses: MesProjetado[] = Array.from({ length: total }, (_, i) => ({
    month: somarMeses(primeiro, i),
    entra: 0,
    sai: 0,
    fim: 0,
  }));
  const slot = (date: string) => {
    const key = date < args.hoje ? primeiro : mesDe(date);
    return meses.find((m) => m.month === key);
  };

  let semDataCents = 0;
  for (const e of args.entradas) {
    if (e.date === null) {
      semDataCents += e.cents;
      continue;
    }
    const m = slot(e.date);
    if (m) m.entra += e.cents;
  }
  for (const s of args.saidas) {
    const m = slot(s.date);
    if (m) m.sai += s.cents;
  }

  let corrente = args.caixa;
  let menorCents = args.caixa;
  let menorMes: string | null = null;
  for (const m of meses) {
    corrente += m.entra - m.sai;
    m.fim = corrente;
    if (corrente < menorCents) {
      menorCents = corrente;
      menorMes = m.month;
    }
  }
  return { caixaHoje: args.caixa, meses, menorCents, menorMes, semDataCents };
}

export type OrigemReserva = "valor" | "meses" | "ambos" | "padrao";

/**
 * Reserva mínima em caixa: o piso que o caixa não pode furar. A pessoa define
 * um valor fixo, uma quantidade de meses de custo, ou os dois (vale o maior).
 * Sem nenhum dos dois, vale um mês de custo. Os meses de custo que o caixa
 * cobre (`meses`) são só informação: não definem o piso.
 */
export function reserva(args: {
  caixa: number;
  custoMensal: number;
  minCents: number | null;
  minMeses: number | null;
}) {
  const porMeses = args.minMeses !== null ? Math.round(args.custoMensal * args.minMeses) : null;
  const origem: OrigemReserva =
    args.minCents !== null && porMeses !== null
      ? "ambos"
      : args.minCents !== null
        ? "valor"
        : porMeses !== null
          ? "meses"
          : "padrao";
  const minimaCents =
    origem === "padrao" ? args.custoMensal : Math.max(args.minCents ?? 0, porMeses ?? 0);
  return {
    minimaCents,
    origem,
    /** Quanto o caixa está acima (ou, negativo, abaixo) do piso. */
    folgaCents: args.caixa - minimaCents,
    /** Quantos meses de custo o caixa cobre; null sem custo para comparar. */
    meses: args.custoMensal > 0 ? args.caixa / args.custoMensal : null,
  };
}

/** Quanto dá para gastar hoje sem o caixa, em qualquer mês, passar da reserva mínima. */
export function livreParaGastar(menorCents: number, reservaMinima: number): number {
  return Math.max(0, menorCents - reservaMinima);
}

export type TipoCompromisso = "uma" | "parcelado" | "mensal";

export interface Compromisso {
  /** Valor de cada pagamento (a vez única, a parcela ou o mês), em centavos. */
  cents: number;
  tipo: TipoCompromisso;
  /** Primeiro mês, AAAA-MM-01. */
  mes: string;
  /** Só no parcelado. */
  parcelas?: number;
}

/** A mesma projeção com o compromisso já pago: o que o simulador desenha por cima. */
export function simular(base: Projecao, c: Compromisso, reservaMinima: number) {
  const ultimo = base.meses.length - 1;
  const inicio = base.meses.findIndex((m) => m.month === c.mes);
  const de = inicio < 0 ? 0 : inicio;
  const ate =
    c.tipo === "uma" ? de : c.tipo === "parcelado" ? de + Math.max(1, c.parcelas ?? 1) - 1 : ultimo;

  let acumulado = 0;
  let menorCents = base.caixaHoje;
  const fim = base.meses.map((m, i) => {
    if (i >= de && i <= ate) acumulado += c.cents;
    const v = m.fim - acumulado;
    if (v < menorCents) menorCents = v;
    return v;
  });
  return { fim, menorCents, cabe: menorCents >= reservaMinima, sobraCents: menorCents - reservaMinima };
}

export type Faixa = "atrasado" | "semana" | "mes" | "depois" | "semData";

export const FAIXA_ROTULO: Record<Faixa, string> = {
  atrasado: "Atrasado",
  semana: "Esta semana",
  mes: "Depois, neste mês",
  depois: "Nos próximos meses",
  semData: "Sem dia combinado",
};

export const FAIXAS: Faixa[] = ["atrasado", "semana", "mes", "depois", "semData"];

/** Em que grupo de urgência a conta cai: o que o olho precisa ver primeiro vem primeiro. */
export function faixaDe(date: string | null, hoje: string): Faixa {
  if (date === null) return "semData";
  if (date < hoje) return "atrasado";
  const d = new Date(`${hoje}T12:00:00`);
  d.setDate(d.getDate() + 6);
  if (date <= d.toLocaleDateString("sv-SE")) return "semana";
  return date.slice(0, 7) === hoje.slice(0, 7) ? "mes" : "depois";
}

/** Último dia do mês de `iso`, AAAA-MM-DD. */
export function fimDoMes(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return `${iso.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

/**
 * Só o que pertence a `mes` (AAAA-MM-01). No mês corrente entra também o que
 * já venceu e continua aberto; nos outros, só o que vence dentro dele. É o que
 * impede o "A pagar" de somar as fixas dos próximos meses todas juntas.
 */
export function doMes<T>(itens: T[], data: (t: T) => string, mes: string, hoje: string): T[] {
  const atual = `${hoje.slice(0, 7)}-01`;
  return itens.filter((t) => {
    const d = data(t);
    return mes === atual ? d <= fimDoMes(hoje) : `${d.slice(0, 7)}-01` === mes;
  });
}

/** De onde vem o piso da reserva, em palavras (a tela mostra embaixo do valor). */
export function rotuloReserva(origem: OrigemReserva, minMeses: number | null): string {
  const m = minMeses === null ? "" : `${String(minMeses).replace(".", ",")} ${minMeses === 1 ? "mês" : "meses"} de custo`;
  if (origem === "valor") return "valor fixo";
  if (origem === "meses") return m;
  if (origem === "ambos") return `o maior entre o valor fixo e ${m}`;
  return "1 mês de custo (padrão)";
}
