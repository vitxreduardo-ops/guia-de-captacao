// Casamento de nomes digitados com cadastro (cliente, pessoa da equipe).
// Puro, sem banco: quem chama traz a lista já filtrada pelo acesso.

export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type MatchResult<T> =
  | { kind: "one"; item: T }
  | { kind: "many"; items: T[] }
  | { kind: "none" };

/**
 * Confiável primeiro: código exato, nome exato; depois começo de palavra.
 * "Foco" acha "Foco Ambiental"; "oco" não acha nada (meio de palavra é
 * palpite demais pra virar operação). Empate devolve todos, e o agente
 * pergunta qual.
 */
export function matchByName<T>(
  items: T[],
  query: string,
  names: (item: T) => string[],
  code?: (item: T) => string
): MatchResult<T> {
  const q = normalizeName(query);
  if (!q) return { kind: "none" };

  const pick = (found: T[]): MatchResult<T> | null =>
    found.length === 1 ? { kind: "one", item: found[0] } : found.length > 1 ? { kind: "many", items: found } : null;

  if (code) {
    const byCode = pick(items.filter((i) => code(i) === query.trim()));
    if (byCode) return byCode;
  }
  const exact = pick(items.filter((i) => names(i).some((n) => normalizeName(n) === q)));
  if (exact) return exact;

  const words = q.split(" ");
  const prefix = pick(
    items.filter((i) =>
      names(i).some((n) => {
        const target = ` ${normalizeName(n)}`;
        return words.every((w) => target.includes(` ${w}`));
      })
    )
  );
  return prefix ?? { kind: "none" };
}
