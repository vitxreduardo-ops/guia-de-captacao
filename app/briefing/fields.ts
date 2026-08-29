export type Field = {
  name: string;
  /** Só aparece quando o serviço escolhido está nesta lista. */
  only?: string[];
  label: string;
  hint?: string;
  type?: "text" | "textarea" | "choice";
  options?: string[];
  required?: boolean;
};

export type Step = { title: string; fields: Field[] };

export const SERVICOS = [
  "Identidade visual",
  "Conteúdo para redes",
  "Vídeo",
  "Site",
  "Ainda não sei",
] as const;

export const MAX_ANSWER_LENGTH = 2000;

export const STEPS: Step[] = [
  {
    title: "Quem é você",
    fields: [
      { name: "nome", label: "Nome e marca", required: true },
      { name: "contato", label: "WhatsApp", required: true },
      {
        name: "oque_faz",
        label: "O que a marca faz, em uma frase",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    title: "O projeto",
    fields: [
      {
        name: "servico",
        label: "O que você precisa",
        type: "choice",
        options: [...SERVICOS],
        required: true,
      },
      { name: "motivo", label: "Por que agora? O que motivou", type: "textarea" },
      {
        name: "incomodo",
        label: "Como é hoje — o que te incomoda",
        type: "textarea",
      },
    ],
  },
  {
    title: "Sobre esse trabalho",
    fields: [
      {
        name: "id_tem_marca",
        only: ["Identidade visual"],
        label: "Já existe uma marca hoje? O que precisa sobreviver dela",
        type: "textarea",
      },
      {
        name: "id_aplicacoes",
        only: ["Identidade visual"],
        label: "Onde a marca vai aparecer",
        hint: "Embalagem, fachada, uniforme, rede social, papelaria…",
        type: "textarea",
      },
      {
        name: "redes_canais",
        only: ["Conteúdo para redes"],
        label: "Quais redes e com que frequência",
      },
      {
        name: "redes_quem_aparece",
        only: ["Conteúdo para redes"],
        label: "Quem aparece e quem grava no dia a dia",
        type: "textarea",
      },
      {
        name: "redes_acervo",
        only: ["Conteúdo para redes"],
        label: "Já tem acervo de fotos e vídeos?",
        type: "choice",
        options: ["Sim, organizado", "Sim, bagunçado", "Quase nada"],
      },
      {
        name: "video_tipo",
        only: ["Vídeo"],
        label: "Que tipo de vídeo e quanto tempo",
        hint: "Institucional, anúncio, série de reels, cobertura de evento…",
        type: "textarea",
      },
      {
        name: "video_onde_roda",
        only: ["Vídeo"],
        label: "Onde vai rodar",
        hint: "Feed, anúncio pago, TV, evento, site…",
      },
      {
        name: "video_producao",
        only: ["Vídeo"],
        label: "Precisa de captação ou só edição?",
        type: "choice",
        options: ["Captação e edição", "Só edição", "Não sei ainda"],
      },
      {
        name: "site_paginas",
        only: ["Site"],
        label: "Quantas páginas e o que cada uma precisa fazer",
        type: "textarea",
      },
      {
        name: "site_venda",
        only: ["Site"],
        label: "Vai vender pelo site?",
        type: "choice",
        options: ["Sim, loja completa", "Só direciona pro WhatsApp", "Não vende"],
      },
      {
        name: "site_dominio",
        only: ["Site"],
        label: "Já tem domínio e hospedagem? Quem atualiza depois",
        type: "textarea",
      },
    ],
  },
  {
    title: "Público e objetivo",
    fields: [
      { name: "publico", label: "Quem é o cliente ideal", type: "textarea" },
      {
        name: "sucesso",
        label: "O que conta como sucesso",
        hint: "Venda, reconhecimento, entrar em mercado novo…",
        type: "textarea",
      },
      {
        name: "referencias",
        label: "Referências que admira (até 3 links)",
        type: "textarea",
      },
    ],
  },
  {
    title: "Tom e prático",
    fields: [
      { name: "e", label: "Três palavras que a marca É" },
      { name: "nao_e", label: "Três palavras que a marca NÃO É" },
      { name: "prazo", label: "Prazo / data-limite real" },
      {
        name: "verba",
        label: "Faixa de investimento",
        type: "choice",
        options: [
          "até 3k",
          "3k – 8k",
          "8k – 20k",
          "acima de 20k",
          "prefiro conversar",
        ],
      },
      {
        name: "materiais",
        label: "Links de materiais existentes (logo, fotos, manual)",
        type: "textarea",
      },
    ],
  },
];

export const FIELDS: Field[] = STEPS.flatMap((step) => step.fields);

/** Campos que valem pro serviço escolhido — os demais nem são mostrados. */
export function fieldsFor(fields: Field[], servico: string): Field[] {
  return fields.filter((field) => !field.only || field.only.includes(servico));
}

/** Passos com ao menos um campo — o passo específico some pra quem não tem. */
export function stepsFor(servico: string): Step[] {
  return STEPS.map((step) => ({
    ...step,
    fields: fieldsFor(step.fields, servico),
  })).filter((step) => step.fields.length > 0);
}
