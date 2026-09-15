/**
 * A cor que o Google manda pra cada evento é a cor *cheia* — pensada pra
 * preencher um bloco inteiro com texto branco por cima. Numa pílula pequena
 * isso quebra: metade da paleta do Google é clara (amarelo, lima, pêssego) e
 * texto branco em cima some.
 *
 * Aqui a cor vira dois tons do mesmo matiz, com a luminosidade *fixada* em
 * vez de herdada: fundo bem claro, texto bem escuro. Fixar é o ponto — é o
 * que garante contraste legível pra qualquer cor de entrada, inclusive as
 * que já chegam claras. O matiz sobrevive, então o evento continua
 * reconhecível pela cor.
 */
export function eventTint(hex: string): { bg: string; fg: string } {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  // Cor ilegível (ou ausente): cinza neutro, que é melhor que um evento
  // invisível.
  if (!match) return { bg: "hsl(0 0% 94%)", fg: "hsl(0 0% 25%)" };

  const value = Number.parseInt(match[1], 16);
  const r = (value >> 16) / 255;
  const g = ((value >> 8) & 0xff) / 255;
  const b = (value & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const span = max - min;

  let hue = 0;
  if (span > 0) {
    const raw =
      max === r
        ? ((g - b) / span) % 6
        : max === g
          ? (b - r) / span + 2
          : (r - g) / span + 4;
    hue = raw * 60;
    if (hue < 0) hue += 360;
  }

  const light = (max + min) / 2;
  const sat = span === 0 ? 0 : span / (1 - Math.abs(2 * light - 1));

  return {
    // Saturação puxada pra baixo no fundo e mantida no texto: é o texto que
    // precisa carregar a identidade da cor, não a pastilha atrás dele.
    bg: `hsl(${Math.round(hue)} ${Math.round(sat * 72)}% 93%)`,
    // 22% e não 27%: a luminosidade do HSL não é perceptual, e no amarelo
    // puro 27% ainda rendia 3.99:1 — abaixo do mínimo. O teste cobre isso.
    fg: `hsl(${Math.round(hue)} ${Math.round(sat * 85)}% 22%)`,
  };
}
