import "server-only";

/**
 * Chamada de IA do gerador de roteiros. DeepSeek, Gemini e Grok expõem o
 * mesmo `/chat/completions` da OpenAI, então trocar de provedor é trocar as
 * envs ROTEIROS_AI_* — sem mexer em código.
 *
 * ponytail: usa `response_format: json_schema`. OpenAI, Gemini e Grok aceitam;
 * DeepSeek só aceita `json_object` — ao trocar pra ele, mandar o schema no
 * prompt e pedir `{ type: "json_object" }`.
 */
export const MODELO_ROTEIRO = process.env.ROTEIROS_AI_MODEL || "gpt-4o";
export const MODELO_TRIAGEM =
  process.env.ROTEIROS_AI_MODEL_TRIAGEM || "gpt-4o-mini";

export type MensagemChat = { role: "user" | "assistant"; content: string };

async function completar(body: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.ROTEIROS_AI_KEY;
  if (!apiKey) throw new Error("ROTEIROS_AI_KEY não configurada no servidor.");
  const baseUrl = process.env.ROTEIROS_AI_BASE_URL || "https://api.openai.com/v1";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Erro na API de IA (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia da API de IA.");
  return content;
}

export async function chatJson<T>({
  model,
  system,
  user,
  schema,
  temperature,
}: {
  model: string;
  system: string;
  user: string;
  schema: object;
  temperature: number;
}): Promise<T> {
  const content = await completar({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: schema },
    temperature,
  });
  return JSON.parse(content) as T;
}

/** Conversa livre: devolve o texto da resposta. */
export async function chatTexto({
  model,
  system,
  mensagens,
  temperature,
}: {
  model: string;
  system: string;
  mensagens: MensagemChat[];
  temperature: number;
}): Promise<string> {
  return completar({
    model,
    messages: [{ role: "system", content: system }, ...mensagens],
    temperature,
  });
}
