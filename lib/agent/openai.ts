import "server-only";

// Mesma chave e mesmo endpoint de lib/budgetAi.ts e lib/planejamentoAi.ts
// (Responses API). OPENAI_AGENT_MODEL só existe pra trocar o modelo do
// agente sem mexer no dos orçamentos.
const MODEL = process.env.OPENAI_AGENT_MODEL || process.env.OPENAI_MODEL || "gpt-6.1-terra";

export type ResponseItem = Record<string, unknown> & { type?: string };

export async function callResponses(body: {
  instructions: string;
  input: ResponseItem[];
  tools: unknown[];
}): Promise<ResponseItem[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurada.");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    // store: false — a conversa já fica no nosso banco, e só o texto.
    body: JSON.stringify({ model: MODEL, store: false, ...body }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { output?: ResponseItem[] };
  return json.output ?? [];
}
