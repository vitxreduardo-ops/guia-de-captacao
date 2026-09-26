import { describe, expect, it } from "vitest";
import { roteiroParaVideos } from "@/lib/roteiroTypes";

describe("roteiroParaVideos", () => {
  it("AIDA: hooks e notas na primeira cena, CTAs na última", () => {
    const [video] = roteiroParaVideos("AIDA", "Matrícula", {
      attention: { texto: "a", hooks_alternativos: ["h1", "h2"] },
      interest: { texto: "i" },
      desire: { texto: "d" },
      action: { texto: "c", cta_alternativos: ["c1"] },
      notas_producao: "n",
    });
    expect(video.titulo).toBe("Matrícula");
    expect(video.cenas.map((c) => c.script)).toEqual(["a", "i", "d", "c"]);
    expect(video.cenas[0].hooks_alternativos).toEqual(["h1", "h2"]);
    expect(video.cenas[0].notas_producao).toBe("n");
    expect(video.cenas[3].ctas_alternativos).toEqual(["c1"]);
    expect(video.cenas[1].hooks_alternativos).toEqual([]);
  });

  it("Midtrack abre o desenvolvimento em várias cenas", () => {
    const [video] = roteiroParaVideos("Midtrack", "T", {
      objetivo_video: "",
      emocao_dominante: "",
      hook: { texto: "h" },
      contexto: { texto: "c" },
      desenvolvimento: [{ texto: "d1" }, { texto: "d2" }],
      climax: { texto: "x" },
      payoff: { texto: "p" },
      justificativa_retencao: "",
    });
    expect(video.cenas.map((c) => c.script)).toEqual(["h", "c", "d1", "d2", "x", "p"]);
  });

  it("6 Chapéus vira um vídeo por ângulo", () => {
    const videos = roteiroParaVideos("6Chapeus", "T", {
      roteiros: [
        { angulo: "Emocional", hook: "h", corpo: "b", cta: "c" },
        { angulo: "Prova", hook: "h2", corpo: "b2", cta: "c2" },
      ],
    });
    expect(videos.map((v) => v.titulo)).toEqual(["T — Emocional", "T — Prova"]);
    expect(videos[1].cenas.map((c) => c.script)).toEqual(["h2", "b2", "c2"]);
  });
});
