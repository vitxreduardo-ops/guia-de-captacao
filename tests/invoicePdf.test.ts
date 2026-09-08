import { describe, expect, it } from "vitest";
import { deliveryTitle } from "@/components/pdf/InvoicePdfDocument";

describe("deliveryTitle", () => {
  it("tira o nome do serviço que o snapshot prefixa", () => {
    expect(deliveryTitle("Card — Card - Lado aracnídeo")).toBe(
      "Card - Lado aracnídeo"
    );
  });

  it("mantém a descrição inteira quando não tem serviço", () => {
    expect(deliveryTitle("Trend - 100 passos")).toBe("Trend - 100 passos");
  });

  it("corta só no primeiro separador, o resto é título", () => {
    expect(deliveryTitle("Vídeo — Antes — Depois")).toBe("Antes — Depois");
  });
});
