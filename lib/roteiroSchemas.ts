// Schemas do gerador de roteiros (/admin/roteiros).
// Usados no response_format: json_schema da chamada de IA (lib/roteiroAi.ts).
// Structured Outputs exige additionalProperties: false e todos os campos em "required".

export const schemaAIDA = {
  name: "roteiro_aida",
  strict: true,
  schema: {
    type: "object",
    properties: {
      attention: {
        type: "object",
        properties: {
          texto: { type: "string" },
          hooks_alternativos: { type: "array", items: { type: "string" } },
        },
        required: ["texto", "hooks_alternativos"],
        additionalProperties: false,
      },
      interest: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      desire: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      action: {
        type: "object",
        properties: {
          texto: { type: "string" },
          cta_alternativos: { type: "array", items: { type: "string" } },
        },
        required: ["texto", "cta_alternativos"],
        additionalProperties: false,
      },
      notas_producao: { type: "string" },
    },
    required: ["attention", "interest", "desire", "action", "notas_producao"],
    additionalProperties: false,
  },
};

export const schemaPAS = {
  name: "roteiro_pas",
  strict: true,
  schema: {
    type: "object",
    properties: {
      hook: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      problem: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      agitate: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      solution: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      cta: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
    },
    required: ["hook", "problem", "agitate", "solution", "cta"],
    additionalProperties: false,
  },
};

export const schemaMidtrack = {
  name: "roteiro_midtrack",
  strict: true,
  schema: {
    type: "object",
    properties: {
      objetivo_video: { type: "string" },
      emocao_dominante: { type: "string" },
      hook: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      contexto: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      desenvolvimento: {
        type: "array",
        items: {
          type: "object",
          properties: { texto: { type: "string" } },
          required: ["texto"],
          additionalProperties: false,
        },
      },
      climax: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      payoff: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
        additionalProperties: false,
      },
      justificativa_retencao: { type: "string" },
    },
    required: [
      "objetivo_video",
      "emocao_dominante",
      "hook",
      "contexto",
      "desenvolvimento",
      "climax",
      "payoff",
      "justificativa_retencao",
    ],
    additionalProperties: false,
  },
};

export const schema6Chapeus = {
  name: "roteiros_6_chapeus",
  strict: true,
  schema: {
    type: "object",
    properties: {
      roteiros: {
        type: "array",
        items: {
          type: "object",
          properties: {
            angulo: {
              type: "string",
              enum: [
                "Educacional",
                "Emocional",
                "Polemico",
                "Bastidores",
                "Prova",
                "Tendencia",
              ],
            },
            hook: { type: "string" },
            corpo: { type: "string" },
            cta: { type: "string" },
          },
          required: ["angulo", "hook", "corpo", "cta"],
          additionalProperties: false,
        },
      },
    },
    required: ["roteiros"],
    additionalProperties: false,
  },
};

export const schemaTriagem = {
  name: "triagem_framework",
  strict: true,
  schema: {
    type: "object",
    properties: {
      framework_sugerido: {
        type: "string",
        enum: ["AIDA", "PAS", "Midtrack", "6Chapeus"],
      },
      justificativa: { type: "string" },
    },
    required: ["framework_sugerido", "justificativa"],
    additionalProperties: false,
  },
};

// Chat: as etapas aparecem no "pensamento" acima da resposta.
export const schemaChat = {
  name: "resposta_chat",
  strict: true,
  schema: {
    type: "object",
    properties: {
      raciocinio: {
        type: "array",
        description:
          "De 2 a 4 etapas curtas (até 12 palavras cada) do que você considerou para responder, em português.",
        items: { type: "string" },
      },
      resposta: { type: "string" },
    },
    required: ["raciocinio", "resposta"],
    additionalProperties: false,
  },
};

export function getSchemaPorFramework(framework: string) {
  switch (framework) {
    case "AIDA":
      return schemaAIDA;
    case "PAS":
      return schemaPAS;
    case "Midtrack":
      return schemaMidtrack;
    case "6Chapeus":
      return schema6Chapeus;
    default:
      throw new Error(`Framework desconhecido: ${framework}`);
  }
}
