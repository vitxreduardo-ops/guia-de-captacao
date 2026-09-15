import { describe, expect, it } from "vitest";
import { eventTint } from "@/lib/eventColor";

/** Luminância relativa da WCAG, a partir de um hsl() com s/l em porcento. */
function luminance(css: string) {
  const [h, s, l] = /hsl\((\d+) (\d+)% (\d+)%\)/
    .exec(css)!
    .slice(1)
    .map(Number);

  const chroma = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const base = l / 100 - chroma / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][sector].map((channel) => {
    const value = channel + base;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(bg: string, fg: string) {
  const [light, dark] = [luminance(bg), luminance(fg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

describe("eventTint", () => {
  // A paleta real do Google: os claros (banana, sálvia, flamingo) são
  // justamente os que quebravam com texto branco por cima.
  const googlePalette = [
    "#a4bdfc", // lavanda
    "#7ae7bf", // sálvia
    "#dbadff", // uva
    "#ff887c", // flamingo
    "#fbd75b", // banana
    "#ffb878", // tangerina
    "#46d6db", // pavão
    "#e1e1e1", // grafite
    "#5484ed", // mirtilo
    "#51b749", // manjericão
    "#dc2127", // tomate
    "#4285f4", // azul padrão do calendário
  ];

  it("dá contraste de texto legível pra paleta inteira do Google", () => {
    for (const hex of googlePalette) {
      const { bg, fg } = eventTint(hex);
      expect(contrast(bg, fg), `${hex} → ${bg} / ${fg}`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  it("segura o contraste em qualquer matiz, não só nos da paleta", () => {
    for (let hue = 0; hue < 360; hue += 15) {
      // Uma cor saturada e clara em cada matiz — o pior caso pro texto.
      const value = `#${[0, 8, 4]
        .map((shift) => {
          const channel = Math.round(
            255 * (0.5 + 0.5 * Math.cos(((hue + shift * 15) * Math.PI) / 180))
          );
          return channel.toString(16).padStart(2, "0");
        })
        .join("")}`;
      const { bg, fg } = eventTint(value);
      expect(contrast(bg, fg), `${value} → ${bg} / ${fg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("cai num cinza legível quando a cor não veio", () => {
    const { bg, fg } = eventTint("");
    expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });
});
