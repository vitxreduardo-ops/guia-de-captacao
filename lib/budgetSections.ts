/**
 * As seções da proposta — o formato guardado na coluna `budgets.sections`.
 *
 * Este arquivo é a fonte única de três regras que antes viviam espalhadas na
 * página pública:
 *   1. quais seções existem e em que ordem (SECTION_KINDS);
 *   2. quando uma seção está vazia e portanto não aparece nem consome número
 *      (isEmpty / visibleSections);
 *   3. de que cor é o fundo de cada bloco (blockTone).
 *
 * Não tem "server-only" de propósito: o painel do admin é client component e
 * precisa dos mesmos tipos e das mesmas regras que o servidor usa para render.
 * Nada aqui pode importar Supabase.
 */

export const SECTION_KINDS = [
  "cover",
  "about",
  "portfolio",
  "logos",
  "package1",
  "package1Extra",
  "package2Perks",
  "strategy",
  "pricing",
  "faq",
  "footer",
] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];

/** As quatro seções que compartilham a forma etiqueta + título + lista. */
const LIST_KINDS = [
  "package1",
  "package1Extra",
  "package2Perks",
  "strategy",
] as const;

export type MediaType = "image" | "video";
export type Orientation = "horizontal" | "vertical";

export interface PortfolioProject {
  name: string;
  tag: string;
  url: string;
  mediaType: MediaType;
  orientation: Orientation;
}

export interface ClientLogo {
  name: string;
  url: string;
}

export interface PricingPackage {
  name: string;
  price: number;
  subtitle: string;
  description: string;
  features: string[];
  featured: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SectionData {
  cover: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    videoUrl: string;
  };
  about: {
    eyebrow: string;
    title: string;
    subtitle: string;
    text: string;
    items: string[];
    statNumber: string;
    statCaption: string;
  };
  portfolio: {
    eyebrow: string;
    title: string;
    subtitle: string;
    projects: PortfolioProject[];
  };
  logos: { eyebrow: string; title: string; logos: ClientLogo[] };
  package1: ListSectionData;
  package1Extra: ListSectionData;
  package2Perks: ListSectionData;
  strategy: ListSectionData;
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    packages: PricingPackage[];
  };
  faq: { eyebrow: string; title: string; items: FaqItem[] };
  footer: {
    phrase: string;
    instagram: string;
    youtube: string;
    email: string;
    phone: string;
  };
}

export interface ListSectionData {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: string[];
}

export type BudgetSection<K extends SectionKind = SectionKind> = {
  [Kind in K]: { kind: Kind; enabled: boolean; data: SectionData[Kind] };
}[K];

/** O rótulo de cada seção no painel do admin. */
export const SECTION_LABELS: Record<SectionKind, string> = {
  cover: "Capa",
  about: "Sobre",
  portfolio: "Portfólio",
  logos: "Logos de clientes",
  package1: "Pacote 1 (destaque)",
  package1Extra: "Mas se você precisa (pacote 1)",
  package2Perks: "Diferenciais do pacote 2",
  strategy: "Estratégia",
  pricing: "Valores dos pacotes",
  faq: "Perguntas frequentes",
  footer: "Rodapé",
};

// --- normalização -----------------------------------------------------------
//
// O JSON vem do banco, então pode estar incompleto (orçamento criado antes de
// um campo existir) ou simplesmente errado. Tudo passa por aqui antes de virar
// tipo: campo que falta ganha o default, campo do tipo errado é descartado.

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bool(value: unknown): boolean {
  return value === true;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Lista de texto simples. Apara espaço e descarta linha vazia — é o mesmo
 * tratamento que a página pública dava ao `features` dos pacotes, que era um
 * texto com um item por linha. O backfill da 0051 copia as listas cruas
 * justamente porque a limpeza acontece aqui.
 */
function textList(value: unknown): string[] {
  return arr(value)
    .map((item) => str(item).trim())
    .filter(Boolean);
}

function listData(raw: Record<string, unknown>): ListSectionData {
  return {
    eyebrow: str(raw.eyebrow),
    title: str(raw.title),
    subtitle: str(raw.subtitle),
    items: textList(raw.items),
  };
}

function parseData<K extends SectionKind>(
  kind: K,
  raw: unknown
): SectionData[K] {
  const d = obj(raw);

  if (LIST_KINDS.includes(kind as (typeof LIST_KINDS)[number])) {
    return listData(d) as SectionData[K];
  }

  switch (kind) {
    case "cover":
      return {
        eyebrow: str(d.eyebrow),
        title: str(d.title),
        subtitle: str(d.subtitle),
        cta: str(d.cta),
        videoUrl: str(d.videoUrl),
      } as SectionData[K];

    case "about":
      return {
        eyebrow: str(d.eyebrow),
        title: str(d.title),
        subtitle: str(d.subtitle),
        text: str(d.text),
        items: textList(d.items),
        statNumber: str(d.statNumber),
        statCaption: str(d.statCaption),
      } as SectionData[K];

    case "portfolio":
      return {
        eyebrow: str(d.eyebrow),
        title: str(d.title),
        subtitle: str(d.subtitle),
        projects: arr(d.projects).map((item) => {
          const p = obj(item);
          return {
            name: str(p.name),
            tag: str(p.tag),
            url: str(p.url).trim(),
            mediaType: p.mediaType === "video" ? "video" : "image",
            orientation: p.orientation === "vertical" ? "vertical" : "horizontal",
          };
        }),
      } as SectionData[K];

    case "logos":
      return {
        eyebrow: str(d.eyebrow),
        title: str(d.title),
        logos: arr(d.logos)
          .map((item) => {
            const l = obj(item);
            return { name: str(l.name), url: str(l.url).trim() };
          })
          // Um logo sem imagem não é um logo — some da lista em vez de virar
          // um buraco na faixa.
          .filter((l) => l.url !== ""),
      } as SectionData[K];

    case "pricing":
      return {
        eyebrow: str(d.eyebrow),
        title: str(d.title),
        subtitle: str(d.subtitle),
        cta: str(d.cta),
        packages: arr(d.packages).map((item) => {
          const p = obj(item);
          return {
            name: str(p.name),
            price: num(p.price),
            subtitle: str(p.subtitle),
            description: str(p.description),
            features: textList(p.features),
            featured: bool(p.featured),
          };
        }),
      } as SectionData[K];

    case "faq":
      return {
        eyebrow: str(d.eyebrow),
        title: str(d.title),
        items: arr(d.items)
          .map((item) => {
            const f = obj(item);
            return { question: str(f.question), answer: str(f.answer) };
          })
          .filter((f) => f.question.trim() !== ""),
      } as SectionData[K];

    case "footer":
      return {
        phrase: str(d.phrase),
        instagram: str(d.instagram).trim(),
        youtube: str(d.youtube).trim(),
        email: str(d.email).trim(),
        phone: str(d.phone).trim(),
      } as SectionData[K];
  }

  return listData(d) as SectionData[K];
}

function emptySection<K extends SectionKind>(kind: K): BudgetSection<K> {
  return {
    kind,
    // Seção que não veio do banco nasce desligada: um orçamento antigo não
    // ganha uma seção nova na cara do cliente sem alguém ligar.
    enabled: false,
    data: parseData(kind, {}),
  } as BudgetSection<K>;
}

/**
 * Lê o JSON cru do banco e devolve sempre as 11 seções, na ordem canônica.
 * Seção que falta entra vazia e desligada; kind desconhecido é ignorado.
 */
export function parseSections(raw: unknown): BudgetSection[] {
  const byKind = new Map<string, Record<string, unknown>>();
  for (const item of arr(raw)) {
    const section = obj(item);
    const kind = str(section.kind);
    if (kind && !byKind.has(kind)) byKind.set(kind, section);
  }

  return SECTION_KINDS.map((kind) => {
    const found = byKind.get(kind);
    if (!found) return emptySection(kind);
    return {
      kind,
      enabled: bool(found.enabled),
      data: parseData(kind, found.data),
    } as BudgetSection;
  });
}

/**
 * Uma seção está vazia quando não sobrou nada para mostrar. O rodapé nunca
 * está: ele sempre fecha a página, com ou sem conteúdo.
 */
export function isEmpty(section: BudgetSection): boolean {
  const { kind, data } = section;

  switch (kind) {
    case "cover":
      return data.title.trim() === "";
    case "about":
      return (
        data.title.trim() === "" &&
        data.text.trim() === "" &&
        data.items.length === 0
      );
    case "portfolio":
      return data.projects.length === 0;
    case "logos":
      return data.logos.length === 0;
    case "pricing":
      return data.packages.length === 0;
    case "faq":
      return data.items.length === 0;
    case "footer":
      return false;
    default:
      return data.items.length === 0 && data.title.trim() === "";
  }
}

/**
 * O que o cliente de fato vê: ligado e não vazio. A posição nesta lista é o
 * número da seção na página (01, 02...) e o índice que decide a cor do bloco.
 */
export function visibleSections(sections: BudgetSection[]): BudgetSection[] {
  return sections.filter((section) => section.enabled && !isEmpty(section));
}

/**
 * As cores de fundo dos blocos são sempre uma destas duas — nunca outra cor —
 * alternando conforme os blocos aparecem na página: #838059 (olive, texto
 * claro) e #FFF6E3 (bege claro, texto escuro). Como o índice vem de
 * visibleSections, a alternância continua certa mesmo quando uma proposta não
 * usa todas as seções.
 */
export function blockTone(index: number) {
  const isDark = index % 2 === 0;
  return {
    isDark,
    bg: isDark ? "bg-[var(--tatu-olive)]" : "bg-[var(--tatu-beige)]",
    text: isDark ? "text-[var(--tatu-cream)]" : "text-[var(--tatu-ink)]",
    textMuted: isDark
      ? "text-[var(--tatu-cream)]/75"
      : "text-[var(--tatu-ink)]/70",
    divider: isDark
      ? "border-[var(--tatu-cream)]/20"
      : "border-[var(--tatu-ink)]/15",
    iconBorder: isDark
      ? "border-[var(--tatu-cream)]/30"
      : "border-[var(--tatu-olive)]/40",
    iconColor: isDark ? "text-[var(--tatu-cream)]" : "text-[var(--tatu-olive)]",
  };
}

export type BlockTone = ReturnType<typeof blockTone>;

/** "01", "02"... o número que a seção mostra no topo do bloco. */
export function sectionNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}
