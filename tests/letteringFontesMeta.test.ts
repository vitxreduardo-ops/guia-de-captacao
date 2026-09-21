import { describe, expect, it } from "vitest";
import {
  agrupadoPorCategoria,
  catalogoDeFontes,
  type FonteDaBiblioteca,
  type OpcaoFonte,
} from "@/lib/letteringFontesMeta";

const doApp: OpcaoFonte[] = [
  { family: "Georgia, serif", label: "Georgia", category: "serif", weight: "" },
  { family: "Impact, sans-serif", label: "Impact", category: "display", weight: "" },
];

const salvas: FonteDaBiblioteca[] = [
  { family: "lettering-hookride", label: "Hookride", category: "display", weight: "Regular" },
  { family: "lettering-hookride-bold", label: "Hookride", category: "display", weight: "Bold" },
  { family: "lettering-sem-cat", label: "Sem Categoria", category: "", weight: "" },
];

describe("catalogoDeFontes", () => {
  it("junta os pesos do mesmo nome num grupo só", () => {
    const grupo = catalogoDeFontes(doApp, salvas).find(
      (g) => g.label === "Hookride",
    );
    expect(grupo?.opcoes.map((o) => o.weight)).toEqual(["Regular", "Bold"]);
    expect(grupo?.category).toBe("display");
  });

  it("marca a fonte da biblioteca com a origem, pra ser registrada depois", () => {
    const catalogo = catalogoDeFontes(doApp, salvas);
    const daBiblioteca = catalogo.find((g) => g.label === "Hookride");
    const doApp_ = catalogo.find((g) => g.label === "Georgia");
    expect(daBiblioteca?.opcoes[0].salva).toBeDefined();
    expect(doApp_?.opcoes[0].salva).toBeUndefined();
  });

  it("não duplica quando a fonte da biblioteca já foi registrada", () => {
    const jaRegistrada: OpcaoFonte[] = [
      ...doApp,
      { family: '"lettering-hookride"', label: "Hookride", category: "display", weight: "Regular" },
    ];
    const grupo = catalogoDeFontes(jaRegistrada, salvas).find(
      (g) => g.label === "Hookride",
    );
    expect(grupo?.opcoes).toHaveLength(2);
  });
});

describe("agrupadoPorCategoria", () => {
  it("segue a ordem das categorias e joga o sem categoria pro fim", () => {
    const grupos = agrupadoPorCategoria(catalogoDeFontes(doApp, salvas));
    expect(grupos.map(([categoria]) => categoria)).toEqual([
      "serif",
      "display",
      "",
    ]);
  });
});
