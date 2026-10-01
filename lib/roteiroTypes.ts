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
  description?: string;
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

/**
 * Roteiro colado e organizado pela IA ("Colar roteiro" no editor do guia).
 * Descrição e notas vêm em trechos separados porque cada trecho precisa ser
 * cópia literal de um pedaço do original: juntar dois trechos numa string
 * faria a checagem acusar alteração.
 */
export type RoteiroOrganizado = {
  videos: {
    titulo: string;
    cenas: {
      script: string;
      descricao: string[];
      hooks_alternativos: string[];
      ctas_alternativos: string[];
    }[];
    notas_producao: string[];
  }[];
};

export function organizadoParaVideos(r: RoteiroOrganizado): VideoImportado[] {
  return r.videos.map((v) => ({
    titulo: v.titulo,
    cenas: v.cenas.map((c) =>
      cena(c.script, {
        description: c.descricao.join("\n"),
        hooks_alternativos: c.hooks_alternativos,
        ctas_alternativos: c.ctas_alternativos,
      })
    ),
    notas_producao: v.notas_producao.join("\n"),
  }));
}

const espacos = (t: string) => t.replace(/\s+/g, " ").trim();

/**
 * Confere se a IA só recortou o texto do cliente. Cada trecho tem que existir
 * igual no original (só espaço e quebra de linha são ignorados); o que não
 * existe vai em `alterados`. O que do original não entrou em trecho nenhum
 * vai em `deFora`, pra conferir que só sobraram marcadores ("CENA 1:").
 * Títulos não entram: são rótulo, não texto do cliente.
 */
export function verificarIntocado(original: string, r: RoteiroOrganizado) {
  const base = espacos(original);
  const coberto = new Array<boolean>(base.length).fill(false);
  const alterados: string[] = [];

  const trechos = r.videos.flatMap((v) => [
    ...v.cenas.flatMap((c) => [
      c.script,
      ...c.descricao,
      ...c.hooks_alternativos,
      ...c.ctas_alternativos,
    ]),
    ...v.notas_producao,
  ]);

  for (const bruto of trechos) {
    const trecho = espacos(bruto);
    if (!trecho) continue;
    // Frase repetida no original: usa a primeira ocorrência ainda livre.
    let i = base.indexOf(trecho);
    while (i !== -1 && coberto[i]) i = base.indexOf(trecho, i + 1);
    if (i === -1) i = base.indexOf(trecho);
    if (i === -1) {
      alterados.push(trecho);
      continue;
    }
    coberto.fill(true, i, i + trecho.length);
  }

  const deFora: string[] = [];
  let atual = "";
  for (let i = 0; i <= base.length; i++) {
    if (i < base.length && !coberto[i]) atual += base[i];
    else {
      // Sobra sem letra nem número (aspas, travessão, pontuação) não conta.
      if (/[\p{L}\p{N}]/u.test(atual)) {
        deFora.push(atual.replace(/^[^\p{L}\p{N}]+|[\s"'“”‘’([{-]+$/gu, ""));
      }
      atual = "";
    }
  }

  return { alterados, deFora };
}

/**
 * O que está no gerador, em texto, pro chat ler junto da conversa ("melhora
 * esse hook" sem colar nada). Vazio quando o formulário está em branco.
 */
export function resumoFormulario(
  comum: ComumParams,
  framework: Framework | null,
  resultado: RoteiroJson | null
): string {
  const linhas = [
    ["Tema", comum.tema],
    ["Objetivo", comum.objetivo],
    ["Contexto da empresa/campanha", comum.contexto],
    ["Tom", comum.tom],
    ["Nicho", nichoFinal(comum)],
    ["Framework", framework ?? ""],
  ]
    .filter(([, valor]) => valor.trim())
    .map(([campo, valor]) => `- ${campo}: ${valor.trim()}`);
  if (linhas.length === 0 && !resultado) return "";
  linhas.push(`- Duração alvo: ${comum.duracaoSegundos} segundos`);

  if (resultado && framework) {
    linhas.push("", "Roteiro gerado:");
    for (const video of roteiroParaVideos(framework, comum.tema, resultado)) {
      linhas.push(`Vídeo: ${video.titulo}`);
      video.cenas.forEach((c, i) => {
        linhas.push(`  Cena ${i + 1}: ${c.script}`);
        if (c.hooks_alternativos.length) linhas.push(`    Hooks alternativos: ${c.hooks_alternativos.join(" | ")}`);
        if (c.ctas_alternativos.length) linhas.push(`    CTAs alternativos: ${c.ctas_alternativos.join(" | ")}`);
      });
      if (video.notas_producao) linhas.push(`  Notas de produção: ${video.notas_producao}`);
    }
  }
  return linhas.join("\n");
}
