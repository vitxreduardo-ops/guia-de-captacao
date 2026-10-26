// Prompt, schema e conferência dos destaques da semana do Repertório.
// Sem "server-only": as funções puras daqui têm teste (tests/repertorioIa.test.ts).

import { cortar } from "@/lib/rss";
import { diaDe, quandoDe, type Noticia } from "@/lib/repertorioTypes";

export type NoticiaCitada = { id: string; titulo: string; url: string; fonte: string };

export type Destaque = {
  titulo: string;
  /** O que aconteceu, só com o que está nas notícias citadas. */
  fato: string;
  /** Interpretação da IA: por que importa. Nunca é informação da matéria. */
  leitura: string;
  noticias: NoticiaCitada[];
};

export type Tendencia = { nome: string; explicacao: string; noticias: NoticiaCitada[] };

export type ConteudoDestaques = {
  panorama: string;
  destaques: Destaque[];
  tendencias: Tendencia[];
};

export type DestaquesDaSemana = ConteudoDestaques & {
  id: string;
  tema: string;
  semana: string;
  totalNoticias: number;
  geradoEm: string;
};

/** Resposta crua da IA: as notícias vêm pelo número da lista. */
type RespostaIa = {
  panorama: string;
  destaques: { titulo: string; fato: string; leitura: string; fontes: number[] }[];
  tendencias: { nome: string; explicacao: string; fontes: number[] }[];
};

/**
 * O cliente de IA corta o texto do usuário em 20 mil caracteres. A lista
 * para antes disso, pra nunca chegar cortada no meio de uma notícia.
 */
const LIMITE_LISTA = 18_000;
const RESUMO_NA_LISTA = 240;

/** Segunda-feira da semana de um dia (AAAA-MM-DD). */
export function inicioDaSemana(dia: string): string {
  const data = new Date(`${dia}T12:00:00Z`);
  const desdeSegunda = (data.getUTCDay() + 6) % 7;
  data.setUTCDate(data.getUTCDate() - desdeSegunda);
  return data.toISOString().slice(0, 10);
}

/** Lista numerada que vai pra IA, e as notícias que couberam nela. */
export function listaParaIa(noticias: Noticia[]): { texto: string; usadas: Noticia[] } {
  const partes: string[] = [];
  const usadas: Noticia[] = [];
  let tamanho = 0;
  for (const noticia of noticias) {
    const resumo = noticia.resumo ? `\n${cortar(noticia.resumo, RESUMO_NA_LISTA)}` : "";
    const parte = `[${usadas.length + 1}] ${noticia.fonte.nome} · ${diaDe(quandoDe(noticia))}\n${noticia.titulo}${resumo}`;
    if (tamanho + parte.length + 2 > LIMITE_LISTA) break;
    partes.push(parte);
    usadas.push(noticia);
    tamanho += parte.length + 2;
  }
  return { texto: partes.join("\n\n"), usadas };
}

function citadas(numeros: number[], usadas: Noticia[]): NoticiaCitada[] {
  const vistos = new Set<number>();
  const lista: NoticiaCitada[] = [];
  for (const numero of Array.isArray(numeros) ? numeros : []) {
    const noticia = Number.isInteger(numero) ? usadas[numero - 1] : undefined;
    if (!noticia || vistos.has(numero)) continue;
    vistos.add(numero);
    lista.push({ id: noticia.id, titulo: noticia.titulo, url: noticia.url, fonte: noticia.fonte.nome });
  }
  return lista;
}

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

/**
 * Confere a resposta antes de gravar: número de notícia que não existe some,
 * destaque sem notícia que o sustente sai, e tendência precisa de duas fontes
 * diferentes (é o que o prompt pede; aqui é onde se garante).
 */
export function montarDestaques(resposta: RespostaIa, usadas: Noticia[]): ConteudoDestaques {
  const destaques = (Array.isArray(resposta?.destaques) ? resposta.destaques : [])
    .map((d) => ({
      titulo: texto(d?.titulo),
      fato: texto(d?.fato),
      leitura: texto(d?.leitura),
      noticias: citadas(d?.fontes, usadas),
    }))
    .filter((d) => d.titulo && d.fato && d.noticias.length > 0)
    .slice(0, 5);

  const tendencias = (Array.isArray(resposta?.tendencias) ? resposta.tendencias : [])
    .map((t) => ({
      nome: texto(t?.nome),
      explicacao: texto(t?.explicacao),
      noticias: citadas(t?.fontes, usadas),
    }))
    .filter((t) => t.nome && new Set(t.noticias.map((n) => n.url)).size >= 2)
    .slice(0, 3);

  return { panorama: texto(resposta?.panorama), destaques, tendencias };
}

export function promptDestaques(tema: string): string {
  return `Você edita um boletim interno de um estúdio de conteúdo (foto, vídeo e redes sociais) que atende pequenos negócios. A equipe lê o boletim para ter repertório sobre o tema "${tema}": o que está acontecendo, o que é tendência e o que foi pauta nos últimos 7 dias.

Você recebe uma lista numerada de notícias, cada uma com fonte, data, título e um resumo curto do feed. É tudo o que você sabe sobre elas.

Devolva:
- panorama: 2 a 3 frases sobre o conjunto da semana. Se as notícias forem poucas, fracas ou repetidas, diga isso em vez de inflar.
- destaques: de 3 a 5 assuntos que mais importam. Notícias sobre o mesmo assunto viram um destaque só.
  - titulo: curto e direto, sem ponto final.
  - fato: o que aconteceu, usando só o que está escrito nas notícias citadas. Nenhum número, nome, data ou detalhe que não esteja nelas.
  - leitura: por que isso importa para quem faz conteúdo e comunicação para pequenos negócios. É interpretação sua: escreva como leitura ("pode indicar", "vale observar"), nunca como fato.
  - fontes: os números das notícias que sustentam o fato.
- tendencias: de 0 a 3 movimentos que aparecem em pelo menos duas notícias diferentes. Sem isso, lista vazia. Não force tendência.
  - nome: curto.
  - explicacao: 1 a 2 frases, como leitura.
  - fontes: os números das notícias (pelo menos dois).

Regras:
- Português do Brasil, frases curtas, sem jargão de agência.
- Proibido: "revolucionar", "game changer", "o futuro é agora", "mais do que nunca", "cada vez mais", "não é apenas X, é Y".
- Não use conhecimento de fora da lista para afirmar fatos.
- Uma notícia pode ser citada em mais de um destaque, mas cada destaque precisa de um assunto próprio.`;
}

export const schemaDestaques = {
  name: "destaques_semana",
  strict: true,
  schema: {
    type: "object",
    properties: {
      panorama: { type: "string" },
      destaques: {
        type: "array",
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            fato: { type: "string" },
            leitura: { type: "string" },
            fontes: { type: "array", items: { type: "integer" } },
          },
          required: ["titulo", "fato", "leitura", "fontes"],
          additionalProperties: false,
        },
      },
      tendencias: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            explicacao: { type: "string" },
            fontes: { type: "array", items: { type: "integer" } },
          },
          required: ["nome", "explicacao", "fontes"],
          additionalProperties: false,
        },
      },
    },
    required: ["panorama", "destaques", "tendencias"],
    additionalProperties: false,
  },
};
