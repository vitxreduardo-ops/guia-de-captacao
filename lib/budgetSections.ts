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
    /** Imagem ou vídeo de fundo: arquivo, YouTube ou Vimeo. */
    mediaUrl: string;
    /** Desfoque da mídia de fundo, em pixels. 0 = sem desfoque. */
    blur: number;
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

/** O desfoque para de fazer diferença muito antes disto; é só um teto. */
export const MAX_BLUR = 40;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
        // videoUrl é o nome antigo, de quando a capa só aceitava vídeo: as
        // propostas gravadas antes ainda têm a chave, e continuam valendo.
        mediaUrl: str(d.mediaUrl, str(d.videoUrl)).trim(),
        blur: clamp(num(d.blur), 0, MAX_BLUR),
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
 * Uma seção está vazia quando não sobrou nada para mostrar.
 *
 * Capa e rodapé nunca estão: uma abre e o outro fecha a página, com ou sem
 * texto — é o que a página pública já fazia, onde o bloco do hero renderizava
 * mesmo com o <h1> vazio. Só ficam de fora se alguém desligar.
 */
export function isEmpty(section: BudgetSection): boolean {
  const { kind, data } = section;

  switch (kind) {
    case "cover":
      return false;
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

/**
 * Como um orçamento novo nasce: com os textos que se repetem em toda proposta
 * já escritos, para sobrar só o que muda de cliente para cliente.
 *
 * Fica ligado o que toda proposta tem — capa, leitura e rodapé. O resto nasce
 * desligado mas já preenchido: ligar a seção não deve ser o começo de uma
 * página em branco.
 *
 * O título da capa fica vazio de propósito: é o nome do cliente, e um texto
 * genérico ali seria justamente o que ninguém pode esquecer de trocar.
 */
export function secoesPadrao(): BudgetSection[] {
  const cru = [
    {
      kind: "cover",
      enabled: true,
      data: {
        eyebrow: "PROPOSTA CRIATIVA · 2026",
        title: "",
        subtitle:
          "Uma direção audiovisual desenhada para transformar atenção em percepção de valor.",
        cta: "Conhecer a proposta",
        mediaUrl: "",
        blur: 0,
      },
    },
    {
      kind: "about",
      enabled: true,
      data: {
        eyebrow: "NOSSA LEITURA",
        title:
          "Sua marca não precisa apenas aparecer. Precisa ser reconhecida.",
        subtitle: "",
        text: "A gente entra na operação para entender o que a sua marca já comunica, o que ainda não está claro e onde está a oportunidade. A partir daí desenha uma rota audiovisual com começo, meio e recorrência.",
        items: [
          "Direção criativa",
          "Produção audiovisual",
          "Gestão de conteúdo",
          "Estratégia de recorrência",
        ],
        statNumber: "150+",
        statCaption: "projetos colocados em movimento",
      },
    },
    {
      kind: "portfolio",
      enabled: false,
      data: {
        eyebrow: "TRABALHOS SELECIONADOS",
        title: "O que já colocamos no ar",
        subtitle: "",
        projects: [],
      },
    },
    {
      kind: "logos",
      enabled: false,
      data: {
        eyebrow: "QUEM JÁ CONFIA",
        title: "Marcas que já colocamos em movimento",
        logos: [],
      },
    },
    {
      kind: "package1",
      enabled: false,
      data: {
        eyebrow: "O QUE ENTRA",
        title: "O que está incluído",
        subtitle: "Tudo que acompanha o pacote, do primeiro alinhamento à entrega.",
        items: [
          "Reunião de alinhamento e definição de pauta",
          "Diária de captação com direção no set",
          "Edição, finalização e tratamento de cor",
          "Entrega nos formatos de cada canal",
        ],
      },
    },
    {
      kind: "package1Extra",
      enabled: false,
      data: {
        eyebrow: "ALÉM DO PACOTE",
        title: "Mas se você precisar de mais",
        subtitle: "O que dá para somar sem trocar de pacote.",
        items: [
          "Diária extra de captação",
          "Cortes adicionais a partir do material já gravado",
          "Design de peças estáticas",
          "Legendagem e versões para tráfego",
        ],
      },
    },
    {
      kind: "package2Perks",
      enabled: false,
      data: {
        eyebrow: "DIFERENCIAIS",
        title: "O que muda no pacote seguinte",
        subtitle: "Onde o próximo nível abre espaço.",
        items: [
          "Planejamento de conteúdo mês a mês",
          "Branding aplicado às peças",
          "Leitura de métricas para guiar a próxima pauta",
          "Prioridade de agenda",
        ],
      },
    },
    {
      kind: "strategy",
      enabled: false,
      data: {
        eyebrow: "COMO FUNCIONA",
        title: "A rota, mês a mês",
        subtitle: "Como a operação roda depois do sim.",
        items: [
          "Alinhamento de pauta no início do mês",
          "Captação concentrada em uma diária",
          "Entregas ao longo do mês, por formato",
          "Leitura de resultado para guiar o mês seguinte",
        ],
      },
    },
    {
      kind: "pricing",
      enabled: false,
      data: {
        eyebrow: "INVESTIMENTO",
        title: "Escolha a rota",
        subtitle: "Todos os pacotes são mensais e recorrentes.",
        cta: "Escolher este pacote",
        // Os preços ficam em zero de propósito: quem define é a calculadora,
        // na aba Configuração, ou a mão. Um valor de exemplo aqui é o tipo de
        // coisa que vai para o cliente sem ninguém perceber.
        packages: [
          {
            name: "START",
            price: 0,
            subtitle: "mínimo para entrar",
            description: "4 vídeos · meia diária",
            features: [
              "Direção criativa",
              "Captação mensal",
              "Edição e finalização",
              "Entrega por formato",
            ],
            featured: false,
          },
          {
            name: "IDEAL",
            price: 0,
            subtitle: "campeão de vendas",
            description: "6 vídeos · diária completa",
            features: [
              "Tudo do START",
              "Planejamento de conteúdo",
              "Branding aplicado",
              "Leitura de métricas",
            ],
            featured: true,
          },
          {
            name: "PRO",
            price: 0,
            subtitle: "tudo + exclusividade",
            description: "até 8 vídeos · frentes múltiplas",
            features: [
              "Tudo do IDEAL",
              "Gestão de tráfego",
              "Prioridade de agenda",
              "Time dedicado",
            ],
            featured: false,
          },
        ],
      },
    },
    {
      kind: "faq",
      enabled: false,
      data: {
        eyebrow: "DÚVIDAS FREQUENTES",
        title: "O que costumam perguntar",
        items: [
          {
            question: "Qual o prazo mínimo de contrato?",
            answer:
              "Três meses. É o tempo que a marca leva para sair do teste e começar a mostrar constância — abaixo disso não dá para ler resultado.",
          },
          {
            question: "Como funciona a aprovação do material?",
            answer:
              "Cada entrega vai com uma rodada de ajustes inclusa. Você comenta direto no material e a versão final sai em até dois dias úteis.",
          },
          {
            question: "E se eu precisar de algo fora do pacote?",
            answer:
              "A gente orça à parte, sem mexer na recorrência. Diária extra, peça avulsa e formatos novos entram assim.",
          },
        ],
      },
    },
    {
      kind: "footer",
      enabled: true,
      data: {
        phrase:
          "Estratégia, direção criativa e audiovisual para marcas que decidiram ocupar espaço.",
        instagram: "",
        youtube: "",
        email: "",
        phone: "",
      },
    },
  ];

  // Passa pelo normalizador como qualquer outro dado: assim um campo novo
  // ganha o default sozinho, sem precisar ser lembrado aqui.
  return parseSections(cru);
}

/** "01", "02"... o número que a seção mostra no topo do bloco. */
export function sectionNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Capa e rodapé abrem e fecham a página sem número — a primeira seção
 *  depois da capa é a 01. */
export function isNumbered(section: BudgetSection): boolean {
  return section.kind !== "cover" && section.kind !== "footer";
}
