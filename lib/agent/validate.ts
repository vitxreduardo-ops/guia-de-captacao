// O modelo manda JSON que pode vir com tipo errado, campo a mais ou data que
// não existe. Nada que ele manda passa direto pro banco: tudo cai aqui antes.

export class ToolInputError extends Error {}

export function reqString(args: Record<string, unknown>, key: string, max = 500): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) throw new ToolInputError(`Falta "${key}".`);
  if (value.length > max) throw new ToolInputError(`"${key}" passou de ${max} caracteres.`);
  return value.trim();
}

export function optString(args: Record<string, unknown>, key: string, max = 2000): string | null {
  const value = args[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ToolInputError(`"${key}" precisa ser texto.`);
  if (value.length > max) throw new ToolInputError(`"${key}" passou de ${max} caracteres.`);
  return value.trim() || null;
}

export function optBool(args: Record<string, unknown>, key: string): boolean {
  const value = args[key];
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") throw new ToolInputError(`"${key}" precisa ser true ou false.`);
  return value;
}

/** AAAA-MM-DD de um dia que existe no calendário. */
export function optDate(args: Record<string, unknown>, key: string): string | null {
  const value = optString(args, key, 10);
  if (value === null) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!m || !d || d.getUTCDate() !== +m[3] || d.getUTCMonth() !== +m[2] - 1) {
    throw new ToolInputError(`"${key}" precisa ser uma data AAAA-MM-DD válida.`);
  }
  return value;
}

export function oneOf<T extends string>(
  args: Record<string, unknown>,
  key: string,
  options: readonly T[]
): T {
  const value = args[key];
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new ToolInputError(`"${key}" precisa ser um de: ${options.join(", ")}.`);
  }
  return value as T;
}

export function optInt(args: Record<string, unknown>, key: string, min: number, max: number, fallback: number): number {
  const value = args[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new ToolInputError(`"${key}" precisa ser inteiro.`);
  return Math.min(max, Math.max(min, value));
}
