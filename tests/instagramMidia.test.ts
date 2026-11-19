import { describe, expect, it } from "vitest";
import { cleanMediaUrls, extractDriveFileId, igExtensionFor, igMediaProblem, igRatioProblem, publishCountdown } from "@/lib/instagramMidia";

describe("igExtensionFor", () => {
  it("aceita JPEG, MP4 e MOV", () => {
    expect(igExtensionFor("image/jpeg")).toBe("jpg");
    expect(igExtensionFor("video/mp4; charset=x")).toBe("mp4");
    expect(igExtensionFor("video/quicktime")).toBe("mov");
  });
  it("recusa PNG, WebP e o resto", () => {
    expect(igExtensionFor("image/png")).toBeNull();
    expect(igExtensionFor("application/pdf")).toBeNull();
  });
});

describe("extractDriveFileId", () => {
  it("lê os formatos de link do Drive", () => {
    expect(extractDriveFileId("https://drive.google.com/file/d/ABC_123-x/view?usp=sharing")).toBe("ABC_123-x");
    expect(extractDriveFileId("https://drive.google.com/open?id=ABC123")).toBe("ABC123");
    expect(extractDriveFileId("https://drive.google.com/uc?export=download&id=ABC123")).toBe("ABC123");
  });
  it("devolve null pra outra coisa", () => {
    expect(extractDriveFileId("https://exemplo.com/a.jpg")).toBeNull();
  });
});

describe("cleanMediaUrls", () => {
  it("tira repetido e link quebrado, mantém a ordem", () => {
    expect(cleanMediaUrls(["https://a.com/1.jpg", "lixo", "https://a.com/1.jpg", "https://a.com/2.jpg"])).toEqual([
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
    ]);
  });
});

describe("igMediaProblem", () => {
  const jpg = (n: number) => Array.from({ length: n }, (_, i) => `https://a.com/${i}.jpg`);
  it("foto/story/reel levam exatamente 1", () => {
    expect(igMediaProblem("foto", jpg(1))).toBeNull();
    expect(igMediaProblem("story", jpg(3))).toMatch(/exatamente 1/);
  });
  it("carrossel leva 2 a 20; card aceita 1 a 20", () => {
    expect(igMediaProblem("carrossel", jpg(1))).toMatch(/2 a 20/);
    expect(igMediaProblem("carrossel", jpg(21))).toMatch(/2 a 20/);
    expect(igMediaProblem("card", jpg(1))).toBeNull();
    expect(igMediaProblem("card", jpg(5))).toBeNull();
  });
  it("reel exige vídeo", () => {
    expect(igMediaProblem("reel", jpg(1))).toMatch(/vídeo/);
    expect(igMediaProblem("reel", ["https://a.com/v.mp4"])).toBeNull();
  });
});

describe("igRatioProblem", () => {
  it("feed aceita de 4:5 a 1,91:1", () => {
    expect(igRatioProblem("foto", [0.8])).toBeNull();
    expect(igRatioProblem("foto", [1.91])).toBeNull();
    expect(igRatioProblem("foto", [0.5625])).toMatch(/mídia 1/);
    expect(igRatioProblem("foto", [2.9])).toMatch(/mídia 1/);
  });
  it("reel e story não passam pela faixa do feed", () => {
    expect(igRatioProblem("reel", [0.5625])).toBeNull();
    expect(igRatioProblem("story", [0.5625])).toBeNull();
  });
  it("carrossel com proporção diferente da primeira", () => {
    expect(igRatioProblem("carrossel", [1, 1, 0.8])).toMatch(/mídia 3 .*diferente/);
    expect(igRatioProblem("carrossel", [0.8, 0.8])).toBeNull();
    expect(igRatioProblem("carrossel", [1, undefined])).toBeNull();
  });
});

describe("publishCountdown", () => {
  const now = Date.parse("2030-01-01T12:00:00Z");
  it("escolhe a unidade certa", () => {
    expect(publishCountdown("2030-01-01T12:20:00Z", now)).toBe("em 20 min");
    expect(publishCountdown("2030-01-01T15:00:00Z", now)).toBe("em 3 h");
    expect(publishCountdown("2030-01-02T12:00:00Z", now)).toBe("em 1 dia");
    expect(publishCountdown("2030-01-07T12:00:00Z", now)).toBe("em 6 dias");
    expect(publishCountdown("2029-12-31T12:00:00Z", now)).toBe("agora");
  });
});
