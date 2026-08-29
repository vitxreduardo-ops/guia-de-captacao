import { describe, expect, it } from "vitest";
import { snap } from "@/lib/letteringSnap";

const palco = { width: 1000, height: 600 };
const caixa = { width: 200, height: 100 };
const tol = 12;

describe("snap", () => {
  it("gruda no centro do palco e mostra a guia", () => {
    const r = snap({ x: 494, y: 302 }, caixa, [], palco, tol);
    expect(r.x).toBe(500);
    expect(r.y).toBe(300);
    expect(r.guias).toEqual([
      { eixo: "x", pos: 500 },
      { eixo: "y", pos: 300 },
    ]);
  });

  it("não puxa o que está longe", () => {
    const r = snap({ x: 400, y: 200 }, caixa, [], palco, tol);
    expect(r).toEqual({ x: 400, y: 200, guias: [] });
  });

  it("encosta a borda na borda do palco", () => {
    // Centro em 104 põe a borda esquerda em 4: perto o bastante de 0.
    const r = snap({ x: 104, y: 300 }, caixa, [], palco, tol);
    expect(r.x).toBe(100);
    expect(r.guias).toContainEqual({ eixo: "x", pos: 0 });
  });

  it("alinha com o centro de outra camada", () => {
    const outra = { left: 750, top: 100, right: 850, bottom: 200 };
    const r = snap({ x: 795, y: 400 }, caixa, [outra], palco, tol);
    expect(r.x).toBe(800);
    expect(r.guias).toContainEqual({ eixo: "x", pos: 800 });
  });

  it("alinha borda com borda de outra camada", () => {
    // Centro da outra em 450, longe o bastante pra só a borda disputar.
    const outra = { left: 300, top: 100, right: 600, bottom: 200 };
    // Centro em 404 põe a borda esquerda em 304, perto de 300.
    const r = snap({ x: 404, y: 400 }, caixa, [outra], palco, tol);
    expect(r.x).toBe(400);
    expect(r.guias).toContainEqual({ eixo: "x", pos: 300 });
  });

  it("borda não gruda em centro: seria alinhamento com lugar nenhum", () => {
    // Centro em 400 põe a borda direita exatamente no centro do palco.
    const r = snap({ x: 400, y: 200 }, caixa, [], palco, tol);
    expect(r.guias.filter((g) => g.eixo === "x")).toEqual([]);
  });

  it("escolhe o alinhamento mais perto entre dois possíveis", () => {
    const perto = { left: 495, top: 0, right: 505, bottom: 10 };
    // O centro do palco (500) e a outra camada disputam; vence quem move menos.
    const r = snap({ x: 502, y: 400 }, caixa, [perto], palco, tol);
    expect(r.x).toBe(500);
  });

  it("um eixo grudado não arrasta o outro", () => {
    const r = snap({ x: 500, y: 123 }, caixa, [], palco, tol);
    expect(r.x).toBe(500);
    expect(r.y).toBe(123);
    expect(r.guias).toEqual([{ eixo: "x", pos: 500 }]);
  });
});
