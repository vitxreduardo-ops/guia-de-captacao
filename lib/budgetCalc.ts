export type MeuNivel = "iniciante" | "intermediario" | "pro";
export type NivelCliente = "pequena" | "medio" | "grande";

export const MEU_NIVEL_MULT: Record<MeuNivel, number> = {
  iniciante: 1.0,
  intermediario: 1.15,
  pro: 1.3,
};

export const NIVEL_CLIENTE_ADJ: Record<NivelCliente, number> = {
  pequena: 0.0,
  medio: 0.03,
  grande: 0.08,
};

export const PACKAGE_WHATSAPP_URL = "https://wa.me/message/EUGPJKECKJANF1";

export interface RecorrenteInput {
  meuNivel: MeuNivel;
  nivelCliente: NivelCliente;
  estrategia: number;
  videos: number;
  resultado: number;
  extras: number;
  margemPct: number;
  taxPct: number;
}

export interface RecorrenteResult {
  multiplier: number;
  base: number;
  ajuste: number;
  subtotal: number;
  margem: number;
  imposto: number;
  recomendado: number;
}

export function computeRecorrente(input: RecorrenteInput): RecorrenteResult {
  const multiplier =
    (MEU_NIVEL_MULT[input.meuNivel] ?? 1) +
    (NIVEL_CLIENTE_ADJ[input.nivelCliente] ?? 0);
  const base = input.estrategia + input.videos;
  const ajuste = base * (multiplier - 1);
  const subtotal = base + ajuste + input.resultado + input.extras;
  const margem = subtotal * (input.margemPct / 100);
  const imposto = (subtotal + margem) * (input.taxPct / 100);
  const recomendado = subtotal + margem + imposto;

  return { multiplier, base, ajuste, subtotal, margem, imposto, recomendado };
}

export function packagesFromRecomendado(recomendado: number) {
  const ideal = Math.round(recomendado / 10) * 10;
  const start = Math.round((ideal * 0.72) / 10) * 10;
  const pro = Math.round((ideal * 1.32) / 10) * 10;
  return { start, ideal, pro };
}

export interface FreelaInput {
  daily: number;
  days: number;
  strategy: number;
  traffic: number;
  marginPct: number;
  taxPct: number;
}

export function computeFreela(input: FreelaInput): number {
  const base = input.daily * input.days + input.strategy + input.traffic;
  const withMargin = base * (1 + input.marginPct / 100);
  const withTax = withMargin * (1 + input.taxPct / 100);
  return withTax;
}
