import "server-only";
import { parseContent, type CampoTexto, type Entrega, type PlanejamentoContent } from "@/lib/planejamentoTypes";

const MODEL = process.env.OPENAI_MODEL || "gpt-6.1-terra";

const text = { type: "string" };
const int = { type: "integer" };
const list = { type: "array", items: text };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const lista = (properties: Record<string, unknown>) => ({ type: "array", items: obj(properties) });

const SCHEMA = obj({
  ano: int,
  mes: int,
  resumo: text,
  fatos: list,
  comQuemFalamos: text,
  comoFunciona: list,
  regras: list,
  tomDeVoz: list,
  linhas: lista({ titulo: text, descricao: text }),
  rotina: lista({ dia: text, texto: text, tipo: { type: "string", enum: ["livre", "stories", "feed", "plantao"] } }),
  avisos: list,
  semanas: lista({ numero: int, inicio: int, fim: int, tema: text, objetivo: text }),
  entregas: lista({
    dia: int,
    semana: int,
    tipo: { type: "string", enum: ["feed", "stories", "reels"] },
    titulo: text,
    curto: text,
    linha: text,
    porque: text,
    formato: text,
    marco: text,
    card: text,
    fala: text,
    telas: list,
    comoFazer: list,
    legenda: text,
    observacao: text,
    referencias: lista({ titulo: text, url: text }),
    detalhes: lista({ rotulo: text, texto: text }),
  }),
});

const PROMPT = `Você transforma o planejamento mensal de um cliente do Tatu Estúdio Criativo (social media, foto e vídeo para pequenos negócios) em dados, a partir do material que o estúdio colou: um texto, o código de uma página (o conteúdo pode estar dentro de <script>, em variáveis como WEEKS e POSTS) ou um PDF.

O cliente lê no celular, tem entre 18 e 70 anos e não conhece jargão de marketing. Cada entrega vira uma página própria com tudo o que ele precisa pra fazer só ela.

Regras gerais:
- Use SOMENTE o que está no material. Não invente fatos, datas, posts, textos nem links.
- Campo sem informação fica "" (texto), [] (lista) ou 0 (número).
- ano e mes (1 a 12) do planejamento.

Estratégia:
- resumo: a ideia do mês em até 2 frases, como está no material.
- fatos: etiquetas curtas do resumo (ex.: "4 posts no feed", "Quinta sem postagem").
- comQuemFalamos: o público. comoFunciona, regras, tomDeVoz: um item por regra, frases do material.
- linhas: as linhas (pilares) de conteúdo, com descrição curta.
- rotina: um item por dia da semana que o material descreve, de segunda a domingo. "dia" abreviado ("Seg"); "texto" curto; "tipo": livre, stories, feed ou plantao.
- avisos: avisos do mês que não são postagem (ex.: "Dia 1: você recebe as legendas do mês").

Semanas: uma por semana do material, com dia de início e fim no mês, tema e objetivo.

Entregas (uma por post de feed ou dia de stories; marcos que não são postagem ficam em avisos):
- dia (número do dia no mês), semana (número da semana), tipo: feed (post ou card), reels (vídeo no feed) ou stories. Se o material chama de Reel, use reels.
- titulo como no material; curto é o nome curto (até 4 palavras) se houver.
- linha: a linha de conteúdo do post. porque: o motivo desta entrega, se o material der um específico dela (ex.: campo \"Por quê\"); senão \"\". formato: o que o material disser (ex.: "vídeo de ~30 s ou 3 telas", "Carrossel com 4 a 6 fotos"). marco: data comemorativa do dia, se houver.
- card: o texto do card, como está.
- fala: o texto para falar para a câmera.
- telas: um item por tela de texto, na ordem.
- comoFazer: instruções de produção, um item por instrução.
- legenda: a legenda inteira, com a chamada final se o material juntar uma (ex.: variável CTA).
- observacao: notas e lembretes do post.
- detalhes: todo campo rotulado do material que não tem lugar acima (ex.: Gancho, Cenário, Palavra-chave, Gravação, Recapitula), um item por campo: rotulo como no material e texto copiado. Não repita aqui o que já foi para outro campo.
- referencias: só links http(s) do material ligados a esse post.
- COPIE fala, telas, legenda, card e instruções PALAVRA POR PALAVRA, inteiros, com emojis e quebras de linha. Nunca resuma, corte, junte nem reescreva. Mantenha trechos entre colchetes.`;

export class IaError extends Error {}

/** Uma chamada à API de Responses; devolve o texto da resposta. */
async function chamarOpenAI(body: Record<string, unknown>): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new IaError("Falta a OPENAI_API_KEY no .env.local.");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    console.error("[planejamentoAi]", res.status, await res.text());
    throw new IaError(`A OpenAI recusou o pedido (erro ${res.status}).`);
  }
  const json = await res.json();
  const saida = json.output
    ?.flatMap((o: { content?: { type: string; text?: string }[] }) => o.content ?? [])
    .find((c: { type: string }) => c.type === "output_text")?.text;
  if (!saida) throw new IaError("A IA não devolveu nada.");
  return saida;
}

export async function preencherPlanejamento(input: {
  texto: string;
  pdf?: { nome: string; base64: string };
}): Promise<PlanejamentoContent> {
  const content: unknown[] = [];
  if (input.pdf) {
    content.push({
      type: "input_file",
      filename: input.pdf.nome,
      file_data: `data:application/pdf;base64,${input.pdf.base64}`,
    });
  }
  if (input.texto.trim()) content.push({ type: "input_text", text: input.texto });

  const saida = await chamarOpenAI({
    instructions: PROMPT,
    input: [{ role: "user", content }],
    text: { format: { type: "json_schema", name: "planejamento", strict: true, schema: SCHEMA } },
  });

  const c = parseContent(JSON.parse(saida), new Date());
  if (c.entregas.length === 0) throw new IaError("Não achei nenhuma postagem com data no material.");
  return c;
}

const PEDIDO: Record<CampoTexto, string> = {
  fala: "o roteiro para a pessoa falar para a câmera (ou, em stories, o que dizer ou mostrar). Escreva em primeira pessoa, em frases curtas que dá pra ler em voz alta, com começo, meio e fim.",
  legenda: "a legenda do post para o Instagram, com a chamada final pra ação do tema. Parágrafos curtos.",
  card: "o texto do card: uma frase curta e forte que cabe na capa, com no máximo 12 palavras.",
};

/**
 * Rascunho de um campo que o material não trouxe. Usa só o que o planejamento
 * já diz; o que falta de fato vai entre [colchetes] pra equipe completar.
 */
export async function rascunharCampo(input: {
  cliente: string;
  content: PlanejamentoContent;
  entrega: Entrega;
  campo: CampoTexto;
}): Promise<string> {
  const { content: c, entrega: e } = input;
  const contexto = [
    `Cliente: ${input.cliente}`,
    c.resumo && `Ideia do mês: ${c.resumo}`,
    c.comQuemFalamos && `Público: ${c.comQuemFalamos}`,
    c.tomDeVoz.length && `Tom de voz: ${c.tomDeVoz.join(" ")}`,
    c.regras.length && `Regras de conteúdo: ${c.regras.join(" ")}`,
    `Entrega: ${e.titulo} (${e.tipo}${e.formato ? `, ${e.formato}` : ""}), dia ${e.dia}/${c.mes}`,
    e.porque && `Por que existe: ${e.porque}`,
    e.marco && `Data: ${e.marco}`,
    e.fala && `Fala já escrita: ${e.fala}`,
    e.legenda && `Legenda já escrita: ${e.legenda}`,
    ...e.detalhes.map((d) => `${d.rotulo}: ${d.texto}`),
  ]
    .filter(Boolean)
    .join("\n");

  const texto = await chamarOpenAI({
    instructions: `Você escreve rascunhos para o Tatu Estúdio Criativo, que faz social media de pequenos negócios. Escreva ${PEDIDO[input.campo]}
Regras: português do Brasil, tom de voz do cliente, sem jargão. Use SOMENTE os fatos do contexto; nunca invente número, prazo, preço, caso de cliente nem promessa de resultado. O que faltar de fato vai entre [colchetes] pra equipe completar. Responda só com o texto, sem título nem explicação.`,
    input: [{ role: "user", content: [{ type: "input_text", text: contexto }] }],
  });
  return texto.trim();
}
