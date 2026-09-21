/**
 * Rótulos de peso e categoria da biblioteca de fontes.
 *
 * Ficam fora de `letteringLibrary` porque aquele arquivo é `server-only` e o
 * estúdio (componente de cliente) precisa montar os selects com essa lista.
 */
/** Só o que o catálogo precisa saber da fonte guardada no banco. */
export interface FonteDaBiblioteca {
  family: string;
  label: string;
  weight: string;
  category: string;
}

export const CATEGORIAS_FONTE = [
  "sans",
  "serif",
  "slab",
  "script",
  "display",
  "mono",
] as const;

export type CategoriaFonte = (typeof CATEGORIAS_FONTE)[number];

export const PESOS_FONTE = [
  "Thin",
  "Light",
  "Regular",
  "Medium",
  "SemiBold",
  "Bold",
  "Black",
  "Italic",
] as const;

/** Quebra o catálogo em optgroups, na ordem de CATEGORIAS_FONTE. */
export function agrupadoPorCategoria(
  catalogo: GrupoDeFamilia[],
): [string, GrupoDeFamilia[]][] {
  const ordem = [...CATEGORIAS_FONTE, ""];
  return ordem
    .map(
      (categoria) =>
        [
          categoria,
          catalogo.filter(
            (g) =>
              (ordem.includes(g.category as (typeof ordem)[number])
                ? g.category
                : "") === categoria,
          ),
        ] as [string, GrupoDeFamilia[]],
    )
    .filter(([, grupos]) => grupos.length > 0);
}

export interface OpcaoFonte {
  /** Valor que vai pra camada, já com aspas quando é família própria. */
  family: string;
  label: string;
  category: string;
  weight: string;
  /** Presente quando a fonte veio da biblioteca e precisa ser registrada. */
  salva?: FonteDaBiblioteca;
}

export interface GrupoDeFamilia {
  label: string;
  category: string;
  /** Um item por peso cadastrado. */
  opcoes: OpcaoFonte[];
}

/**
 * Junta as fontes do app com as da biblioteca em grupos por nome, cada grupo
 * com seus pesos. É o que alimenta os dois seletores: a fonte é escolhida pelo
 * nome (dentro da categoria) e o peso depois, sem poluir uma lista só.
 */
export function catalogoDeFontes(
  registradas: OpcaoFonte[],
  salvas: FonteDaBiblioteca[],
): GrupoDeFamilia[] {
  const daBiblioteca: OpcaoFonte[] = salvas.map((f) => ({
    family: `"${f.family}"`,
    label: f.label,
    category: f.category,
    weight: f.weight,
    salva: f,
  }));

  const grupos = new Map<string, GrupoDeFamilia>();
  // A biblioteca entra depois: quando a mesma família já foi registrada, o
  // item com `salva` vence e o seletor ainda sabe buscar o arquivo.
  for (const opcao of [...registradas, ...daBiblioteca]) {
    const chave = opcao.label.toLowerCase();
    const grupo = grupos.get(chave) ?? {
      label: opcao.label,
      category: opcao.category,
      opcoes: [],
    };
    const igual = grupo.opcoes.findIndex((o) => o.family === opcao.family);
    if (igual === -1) grupo.opcoes.push(opcao);
    else grupo.opcoes[igual] = opcao;
    if (opcao.category) grupo.category = opcao.category;
    grupos.set(chave, grupo);
  }

  const ordem = [...CATEGORIAS_FONTE, ""];
  return [...grupos.values()].sort(
    (a, b) =>
      ordem.indexOf(a.category as (typeof ordem)[number]) -
        ordem.indexOf(b.category as (typeof ordem)[number]) ||
      a.label.localeCompare(b.label),
  );
}
