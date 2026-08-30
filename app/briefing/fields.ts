export type Field = {
  name: string;
  /** Só aparece quando o serviço escolhido está nesta lista. */
  only?: string[];
  /** Só aparece quando outro campo já foi respondido com um destes valores. */
  showWhen?: { field: string; values: string[] };
  label: string;
  hint?: string;
  type?: "text" | "textarea" | "choice";
  options?: string[];
  required?: boolean;
};

export type Step = { title: string; fields: Field[] };

export const MAX_ANSWER_LENGTH = 2000;

export const SERVICOS = [
  "Identidade visual",
  "Conteúdo para redes",
  "Vídeo",
  "Site",
  "Ainda não sei",
] as const;

const DIAGNOSTICO = ["Identidade visual", "Site", "Ainda não sei"];
const MARCA = ["Identidade visual", "Conteúdo para redes"];
const TODOS_MENOS_VIDEO = [
  "Identidade visual",
  "Conteúdo para redes",
  "Site",
  "Ainda não sei",
];

/** As duas formas de trabalho que põem alguém gravando em campo. */
const COM_CAPTACAO = ["Captação completa", "Somente captação"];

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
      {
        name: "motivo",
        only: DIAGNOSTICO,
        label: "O que fez você procurar isso agora",
        type: "textarea",
      },
      {
        name: "incomodo",
        only: DIAGNOSTICO,
        label: "O que mais te incomoda hoje",
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
        hint: "Embalagem, fachada, uniforme, rede social, papelaria",
        type: "textarea",
      },
      {
        name: "redes_canais",
        only: ["Conteúdo para redes"],
        label: "Quais redes e quantos posts por semana",
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
      // Vídeo é encomenda: o que importa é o que tem que existir no fim e o
      // que não pode entrar. Por isso quase tudo é escolha, não texto livre,
      // e não passa por "por que agora".
      {
        name: "video_formato",
        only: ["Vídeo"],
        label: "Que tipo de vídeo",
        type: "choice",
        options: [
          "Institucional",
          "Anúncio",
          "Reels ou TikTok",
          "Motion",
          "Cobertura de evento",
          "Depoimento de cliente",
          "Outro",
        ],
      },
      {
        name: "video_formato_outro",
        only: ["Vídeo"],
        showWhen: { field: "video_formato", values: ["Outro"] },
        label: "Qual",
      },
      {
        name: "video_quantidade",
        only: ["Vídeo"],
        label: "Quantos vídeos",
        type: "choice",
        options: ["1", "2 a 3", "4 a 8", "Mais de 8"],
      },
      {
        name: "video_duracao",
        only: ["Vídeo"],
        label: "Duração de cada um",
        type: "choice",
        options: ["Até 30s", "30s a 1min", "1 a 3min", "Mais de 3min"],
      },
      {
        name: "video_onde_roda",
        only: ["Vídeo"],
        label: "Onde vai rodar",
        type: "choice",
        options: [
          "Instagram e TikTok",
          "YouTube",
          "Anúncio pago",
          "Site",
          "Evento ou tela interna",
        ],
      },
      {
        name: "video_producao",
        only: ["Vídeo"],
        label: "O que entra no trabalho",
        type: "choice",
        options: ["Captação completa", "Somente edição", "Somente captação"],
      },
      {
        name: "video_aparece",
        only: ["Vídeo"],
        label: "Quem e o que aparece",
        hint: "Pessoas, produto, loja, bastidor",
        type: "textarea",
      },
      {
        name: "video_quando_onde",
        only: ["Vídeo"],
        showWhen: { field: "video_producao", values: COM_CAPTACAO },
        label: "Quando e onde é a gravação",
        hint: "Data, cidade, local. Se ainda não sabe, escreva o que já sabe",
        type: "textarea",
      },
      {
        name: "video_responsavel",
        only: ["Vídeo"],
        showWhen: { field: "video_producao", values: COM_CAPTACAO },
        label: "No dia da captação, quem manda",
        hint: "Nome e WhatsApp de quem decide no local, se não for você",
        type: "textarea",
      },
      {
        name: "video_nao_pode",
        only: ["Vídeo"],
        label: "O que não pode",
        hint: "Rosto que não pode aparecer, concorrente na imagem, música com direitos, palavra proibida pelo setor",
        type: "textarea",
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
        options: [
          "Sim, loja completa",
          "Só encaminha pro WhatsApp",
          "Não vende",
        ],
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
        only: TODOS_MENOS_VIDEO,
        label: "O que conta como sucesso",
        hint: "Vender mais, ser reconhecido, entrar em um mercado novo",
        type: "textarea",
      },
      {
        name: "referencias",
        label: "Referências que você admira (até 3 links)",
        type: "textarea",
      },
    ],
  },
  {
    title: "Tom e prático",
    fields: [
      { name: "e", only: MARCA, label: "Três palavras que a marca é" },
      { name: "nao_e", only: MARCA, label: "Três palavras que a marca não é" },
      { name: "prazo", label: "Prazo ou data que não dá pra furar" },
      {
        name: "verba",
        label: "Faixa de investimento",
        type: "choice",
        options: [
          "até 3k",
          "3k a 8k",
          "8k a 20k",
          "acima de 20k",
          "prefiro conversar",
        ],
      },
      {
        name: "materiais",
        label: "Links de materiais que você já tem",
        hint: "Logo, fotos, manual da marca, vídeos antigos",
        type: "textarea",
      },
    ],
  },
];

export const FIELDS: Field[] = STEPS.flatMap((step) => step.fields);

/**
 * Campos que valem pras respostas até agora: o serviço escolhido decide o
 * bloco, e um campo com showWhen só existe depois da resposta que o abre.
 */
export function fieldsFor(
  fields: Field[],
  answers: Record<string, string>,
): Field[] {
  return fields.filter((field) => {
    if (field.only && !field.only.includes(answers.servico ?? "")) return false;
    if (field.showWhen) {
      const answer = answers[field.showWhen.field] ?? "";
      if (!field.showWhen.values.includes(answer)) return false;
    }
    return true;
  });
}

/** Passos com ao menos um campo — o passo específico some pra quem não tem. */
export function stepsFor(answers: Record<string, string>): Step[] {
  return STEPS.map((step) => ({
    ...step,
    fields: fieldsFor(step.fields, answers),
  })).filter((step) => step.fields.length > 0);
}
