import { describe, expect, it } from "vitest";
import { resumoFormulario, type ComumParams } from "@/lib/roteiroTypes";

const vazio: ComumParams = {
  tema: "",
  objetivo: "",
  contexto: "",
  duracaoSegundos: 60,
  tom: "",
  nicho: "",
  nichoCustom: "",
};

describe("resumoFormulario", () => {
  it("formulário em branco não manda nada pro chat", () => {
    expect(resumoFormulario(vazio, null, null)).toBe("");
  });

  it("campos preenchidos e roteiro gerado viram texto", () => {
    const texto = resumoFormulario(
      { ...vazio, tema: "Matrícula", nicho: "Outro", nichoCustom: "Escola" },
      "PAS",
      {
        hook: { texto: "h" },
        problem: { texto: "p" },
        agitate: { texto: "a" },
        solution: { texto: "s" },
        cta: { texto: "c" },
      } as never
    );
    expect(texto).toContain("- Tema: Matrícula");
    expect(texto).toContain("- Nicho: Escola");
    expect(texto).toContain("- Framework: PAS");
    expect(texto).toContain("Cena 1: h");
    expect(texto).toContain("Cena 5: c");
  });
});
