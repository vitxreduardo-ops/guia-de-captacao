import "server-only";
import { parseContent, type PlanejamentoContent } from "@/lib/planejamentoTypes";

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
    tipo: { type: "string", enum: ["feed", "stories"] },
    titulo: text,
    curto: text,
    linha: text,
    formato: text,
    marco: text,
    card: text,
    fala: text,
    telas: list,
    comoFazer: list,
    legenda: text,
    observacao: text,
    referencias: lista({ titulo: text, url: text }),
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
- dia (número do dia no mês), semana (número da semana), tipo feed ou stories.
- titulo como no material; curto é o nome curto (até 4 palavras) se houver.
- linha: a linha de conteúdo do post. formato: o que o material disser (ex.: "vídeo de ~30 s ou 3 telas", "Carrossel com 4 a 6 fotos"). marco: data comemorativa do dia, se houver.
- card: o texto do card, como está.
- fala: o texto para falar para a câmera.
- telas: um item por tela de texto, na ordem.
- comoFazer: instruções de produção, um item por instrução.
- legenda: a legenda inteira, com a chamada final se o material juntar uma (ex.: variável CTA).
- observacao: notas e lembretes do post.
- referencias: só links http(s) do material ligados a esse post.
- COPIE fala, telas, legenda, card e instruções PALAVRA POR PALAVRA, inteiros, com emojis e quebras de linha. Nunca resuma, corte, junte nem reescreva. Mantenha trechos entre colchetes.`;

export class IaError extends Error {}

export async function preencherPlanejamento(input: {
  texto: string;
  pdf?: { nome: string; base64: string };
}): Promise<PlanejamentoContent> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new IaError("Falta a OPENAI_API_KEY no .env.local.");

  const content: unknown[] = [];
  if (input.pdf) {
    content.push({
      type: "input_file",
      filename: input.pdf.nome,
      file_data: `data:application/pdf;base64,${input.pdf.base64}`,
    });
  }
  if (input.texto.trim()) content.push({ type: "input_text", text: input.texto });

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      instructions: PROMPT,
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "planejamento", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok) {
    console.error("[preencherPlanejamento]", res.status, await res.text());
    throw new IaError(`A OpenAI recusou o pedido (erro ${res.status}).`);
  }

  const json = await res.json();
  const saida = json.output
    ?.flatMap((o: { content?: { type: string; text?: string }[] }) => o.content ?? [])
    .find((c: { type: string }) => c.type === "output_text")?.text;
  if (!saida) throw new IaError("A IA não devolveu nada.");

  const c = parseContent(JSON.parse(saida), new Date());
  if (c.entregas.length === 0) throw new IaError("Não achei nenhuma postagem com data no material.");
  return c;
}
