import { describe, expect, it } from "vitest";
import { AGENT_TOOLS } from "@/lib/agent/tools";

// O modo strict da OpenAI recusa o esquema inteiro (e o agente para) se um
// campo não estiver em `required`; pega aqui, não em produção.
describe("ferramentas do agente", () => {
  it("nomes únicos", () => {
    const names = AGENT_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(AGENT_TOOLS.map((t) => [t.name, t] as const))("%s: esquema strict", (_name, tool) => {
    const { properties, required, additionalProperties } = tool.parameters;
    expect(additionalProperties).toBe(false);
    expect([...required].sort()).toEqual(Object.keys(properties).sort());
    expect(tool.description.length).toBeGreaterThan(20);
  });

  it("toda ferramenta de alteração tem tópico de destino", () => {
    for (const tool of AGENT_TOOLS.filter((t) => t.kind === "write")) expect(tool.topic).toBeTruthy();
  });
});
