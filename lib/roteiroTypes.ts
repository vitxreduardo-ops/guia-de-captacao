export type Framework = "AIDA" | "PAS" | "Midtrack" | "6Chapeus";

export type ComumParams = {
  tema: string;
  objetivo: string;
  contexto: string;
  duracaoSegundos: number;
  tom: string;
  nicho: string; // um dos NICHOS, ou "Outro"
  nichoCustom: string; // preenchido apenas quando nicho === "Outro"
};

// Retorna o nicho final a ser enviado à API (resolve o "Outro")
export function nichoFinal(c: ComumParams): string {
  return c.nicho === "Outro" ? c.nichoCustom || "Outro" : c.nicho;
}

export const NICHOS = [
  "Saúde",
  "Odontologia",
  "Estética",
  "Gastronomia",
  "Marketing",
  "Negócios",
  "Educação",
  "Tecnologia",
  "Finanças",
  "Fitness",
  "Moda",
  "Agronegócio",
  "Outro",
];

export const TONS = [
  "Direto",
  "Descontraído",
  "Acolhedor",
  "Inspirador",
  "Provocador",
  "Divertido",
  "Educativo",
  "Sofisticado",
  "Urgente",
  "Emocional",
];

/** O campo de tom é texto livre; os botões ligam e desligam itens separados por vírgula. */
export function separarTons(tom: string): string[] {
  return tom.split(",").map((t) => t.trim()).filter(Boolean);
}

export const DURACAO_MIN = 5;
export const DURACAO_MAX = 600;

export const CTAS = [
  "Comentar",
  "Salvar",
  "Compartilhar",
  "Seguir",
  "Chamar no direct",
  "Clicar no link",
  "Agendar",
  "Comprar",
];

export const ANGULOS_6CHAPEUS = [
  "Educacional",
  "Emocional",
  "Polemico",
  "Bastidores",
  "Prova",
  "Tendencia",
] as const;

export const EMOCOES_MIDTRACK = ["Surpresa", "Indignação", "Ternura", "Curiosidade"];

export const INTENSIDADES_PAS = ["Leve", "Moderado", "Forte"];

/** Texto curto de preview a partir do JSON salvo, nos 4 formatos de framework. */
export function extrairPreview(framework: string, json: unknown): string {
  // Formato solto de propósito: o JSON vem do banco e pode estar incompleto.
  const roteiro = json as Partial<RoteiroAIDA & RoteiroPAS & Roteiro6Chapeus> | null;
  try {
    switch (framework) {
      case "AIDA":
        return roteiro?.attention?.texto ?? "";
      case "PAS":
        return roteiro?.hook?.texto ?? "";
      case "Midtrack":
        return roteiro?.hook?.texto ?? "";
      case "6Chapeus":
        return roteiro?.roteiros?.[0]?.hook ?? "";
      default:
        return "";
    }
  } catch {
    return "";
  }
}

export const STATUS_ROTEIRO = ["novo", "usado", "descartado"] as const;
export type StatusRoteiro = (typeof STATUS_ROTEIRO)[number];

export type Roteiro = {
  id: string;
  created_at: string;
  framework: Framework;
  tema: string;
  objetivo: string;
  contexto: string;
  duracao_segundos: number;
  tom: string | null;
  nicho: string | null;
  roteiro: RoteiroJson;
  favorito: boolean;
  status: StatusRoteiro;
  tags: string[];
};

// Formato do JSON que a IA devolve, um por framework (lib/roteiroSchemas.ts).
type Texto = { texto: string };
export type RoteiroAIDA = {
  attention: Texto & { hooks_alternativos: string[] };
  interest: Texto;
  desire: Texto;
  action: Texto & { cta_alternativos: string[] };
  notas_producao: string;
};
export type RoteiroPAS = {
  hook: Texto;
  problem: Texto;
  agitate: Texto;
  solution: Texto;
  cta: Texto;
};
export type RoteiroMidtrack = {
  objetivo_video: string;
  emocao_dominante: string;
  hook: Texto;
  contexto: Texto;
  desenvolvimento: Texto[];
  climax: Texto;
  payoff: Texto;
  justificativa_retencao: string;
};
export type Roteiro6Chapeus = {
  roteiros: { angulo: string; hook: string; corpo: string; cta: string }[];
};
export type RoteiroJson = RoteiroAIDA | RoteiroPAS | RoteiroMidtrack | Roteiro6Chapeus;

export type PreenchimentoInicial = {
  comum: ComumParams;
  framework: Framework;
  tags: string[];
};

/** Formulário do gerador a partir de um roteiro do histórico ("Usar como base"). */
export function preenchimentoDe(r: Roteiro): PreenchimentoInicial {
  const nicho = r.nicho ?? "";
  // O banco guarda o nicho já resolvido: o que não está na lista veio do "Outro".
  const naLista = nicho === "" || NICHOS.includes(nicho);
  return {
    comum: {
      tema: r.tema,
      objetivo: r.objetivo,
      contexto: r.contexto ?? "",
      duracaoSegundos: r.duracao_segundos,
      tom: r.tom ?? "",
      nicho: naLista ? nicho : "Outro",
      nichoCustom: naLista ? "" : nicho,
    },
    framework: r.framework,
    tags: r.tags ?? [],
  };
}

export type CenaImportada = {
  script: string;
  hooks_alternativos: string[];
  ctas_alternativos: string[];
};
export type VideoImportado = { titulo: string; cenas: CenaImportada[]; notas_producao: string };

function cena(script: string, extra: Partial<CenaImportada> = {}): CenaImportada {
  return { script, hooks_alternativos: [], ctas_alternativos: [], ...extra };
}

/**
 * Roteiro do gerador vira vídeo(s) do guia: cada bloco é uma cena. Os hooks
 * alternativos vão na primeira cena (onde está o hook), os CTAs na última e
 * as notas de produção no vídeo. 6 Chapéus vira um vídeo por ângulo.
 */
export function roteiroParaVideos(
  framework: Framework,
  tema: string,
  json: RoteiroJson
): VideoImportado[] {
  switch (framework) {
    case "AIDA": {
      const r = json as RoteiroAIDA;
      return [
        {
          titulo: tema,
          cenas: [
            cena(r.attention.texto, { hooks_alternativos: r.attention.hooks_alternativos ?? [] }),
            cena(r.interest.texto),
            cena(r.desire.texto),
            cena(r.action.texto, { ctas_alternativos: r.action.cta_alternativos ?? [] }),
          ],
          notas_producao: r.notas_producao ?? "",
        },
      ];
    }
    case "PAS": {
      const r = json as RoteiroPAS;
      return [
        {
          titulo: tema,
          cenas: [r.hook, r.problem, r.agitate, r.solution, r.cta].map((b) => cena(b.texto)),
          notas_producao: "",
        },
      ];
    }
    case "Midtrack": {
      const r = json as RoteiroMidtrack;
      return [
        {
          titulo: tema,
          cenas: [
            r.hook,
            r.contexto,
            ...r.desenvolvimento,
            r.climax,
            r.payoff,
          ].map((b) => cena(b.texto)),
          notas_producao: "",
        },
      ];
    }
    case "6Chapeus": {
      const r = json as Roteiro6Chapeus;
      return r.roteiros.map((a) => ({
        titulo: `${tema} — ${a.angulo}`,
        cenas: [cena(a.hook), cena(a.corpo), cena(a.cta)],
        notas_producao: "",
      }));
    }
  }
}
