import "server-only";
import { parseSections, type BudgetSection } from "@/lib/budgetSections";

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

const text = { type: "string" };
const list = { type: "array", items: text };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const secao = (properties: Record<string, unknown>) =>
  obj({ enabled: { type: "boolean" }, ...properties });
const lista = () =>
  secao({ eyebrow: text, title: text, subtitle: text, items: list });

// Mesmas seções de budgetSections.ts, sem portfólio e logos (são imagens).
const SCHEMA = obj({
  cover: secao({ eyebrow: text, title: text, subtitle: text, cta: text }),
  about: secao({
    eyebrow: text, title: text, subtitle: text, text, items: list,
    statNumber: text, statCaption: text,
  }),
  package1: lista(),
  package1Extra: lista(),
  package2Perks: lista(),
  strategy: lista(),
  pricing: secao({
    eyebrow: text, title: text, subtitle: text, cta: text,
    packages: {
      type: "array",
      items: obj({
        name: text, price: { type: "number" }, subtitle: text,
        description: text, features: list, featured: { type: "boolean" },
      }),
    },
  }),
  faq: secao({
    eyebrow: text, title: text,
    items: { type: "array", items: obj({ question: text, answer: text }) },
  }),
  footer: secao({ phrase: text, instagram: text, youtube: text, email: text, phone: text }),
});

const PROMPT = `Você preenche uma proposta comercial do Tatu Estúdio Criativo (foto, vídeo e social media para pequenos negócios) a partir do material que o estúdio colou: um texto, o código de uma página ou um PDF.

Regras:
- Use SOMENTE o que está no material. Não invente fatos, números, prazos nem preços.
- Preço: só o que estiver escrito no material, em reais, como número. Sem valor claro, 0.
- Campo sem informação no material fica "" (texto) ou [] (lista).
- "enabled": true só para a seção que o material realmente cobre; false nas demais.
- Português do Brasil, tom caloroso e direto, sem jargão. Todo texto começa com letra maiúscula.
- "eyebrow" é uma etiqueta curta em MAIÚSCULAS (ex.: "POR QUE").
- Se o material tem uma lista de pacotes com preços, vira "pricing"; marque featured no pacote que o material destaca (no máximo um).
- Cada item de lista é uma frase curta.
- "cta" da capa e do pricing são textos de botão curtos.`;

export class IaError extends Error {}

/** Lê o material e devolve as 11 seções, já normalizadas pelo parseSections. */
export async function preencherComIa(input: {
  texto: string;
  pdf?: { nome: string; base64: string };
}): Promise<BudgetSection[]> {
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
      text: {
        format: { type: "json_schema", name: "proposta", strict: true, schema: SCHEMA },
      },
    }),
  });
  if (!res.ok) {
    console.error("[preencherComIa]", res.status, await res.text());
    throw new IaError(`A OpenAI recusou o pedido (erro ${res.status}).`);
  }

  const json = await res.json();
  const saida = json.output
    ?.flatMap((o: { content?: { type: string; text?: string }[] }) => o.content ?? [])
    .find((c: { type: string }) => c.type === "output_text")?.text;
  if (!saida) throw new IaError("A IA não devolveu nada.");

  const dados = JSON.parse(saida) as Record<string, { enabled: boolean }>;
  return parseSections(
    Object.entries(dados).map(([kind, { enabled, ...data }]) => ({ kind, enabled, data }))
  );
}
