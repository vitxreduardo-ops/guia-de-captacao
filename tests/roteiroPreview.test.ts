import { describe, expect, it } from "vitest";
import { extrairPreview } from "@/lib/roteiroTypes";

describe("extrairPreview", () => {
  it("pega o hook de cada formato de framework", () => {
    expect(extrairPreview("AIDA", { attention: { texto: "a" } })).toBe("a");
    expect(extrairPreview("PAS", { hook: { texto: "p" } })).toBe("p");
    expect(extrairPreview("Midtrack", { hook: { texto: "m" } })).toBe("m");
    expect(extrairPreview("6Chapeus", { roteiros: [{ hook: "c" }] })).toBe("c");
  });

  it("devolve vazio pra formato desconhecido ou incompleto", () => {
    expect(extrairPreview("X", {})).toBe("");
    expect(extrairPreview("AIDA", null)).toBe("");
  });
});
