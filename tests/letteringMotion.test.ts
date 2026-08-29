import { describe, expect, it } from "vitest";
import {
  molaParada,
  resistencia,
  passoDaMola,
  projetar,
  velocidade,
  type Mola,
} from "@/lib/letteringMotion";

describe("velocidade", () => {
  it("mede em unidades por segundo", () => {
    const a = [
      { valor: 0, t: 0 },
      { valor: 50, t: 50 },
      { valor: 100, t: 100 },
    ];
    expect(velocidade(a, 100)).toBe(1000);
  });

  it("ignora o começo do gesto e enxerga a parada no fim", () => {
    const a = [
      { valor: 0, t: 0 },
      { valor: 500, t: 100 },
      { valor: 500, t: 150 },
      { valor: 500, t: 200 },
    ];
    // Voou no começo e parou nos últimos 80ms: soltar aqui não pode arremessar.
    expect(velocidade(a, 80)).toBe(0);
  });

  it("devolve zero sem amostra suficiente", () => {
    expect(velocidade([])).toBe(0);
    expect(velocidade([{ valor: 10, t: 5 }])).toBe(0);
  });
});

describe("projetar", () => {
  it("é mais seco que a rolagem de lista", () => {
    // A mesma velocidade projeta bem menos que com a taxa de rolagem (0,998).
    expect(projetar(1000)).toBeLessThan(projetar(1000, 0.998) / 5);
  });

  it("anda mais quanto mais rápido o dedo saiu", () => {
    const devagar = projetar(200);
    const rapido = projetar(1000);
    expect(rapido).toBeGreaterThan(devagar);
    expect(Math.sign(projetar(-500))).toBe(-1);
  });

  it("parado não projeta nada", () => {
    expect(projetar(0)).toBe(0);
  });
});

describe("mola", () => {
  it("chega no alvo e para", () => {
    let m: Mola = { valor: 0, velocidade: 0 };
    for (let i = 0; i < 300; i++) m = passoDaMola(m, 100, 1 / 60);
    expect(m.valor).toBeCloseTo(100, 1);
    expect(molaParada(m, 100)).toBe(true);
  });

  it("amortecida não passa do ponto", () => {
    let m: Mola = { valor: 0, velocidade: 0 };
    let maximo = 0;
    for (let i = 0; i < 300; i++) {
      m = passoDaMola(m, 100, 1 / 60, 0.35, 1);
      maximo = Math.max(maximo, m.valor);
    }
    expect(maximo).toBeLessThanOrEqual(100.5);
  });

  it("com pouco amortecimento passa do ponto e volta", () => {
    let m: Mola = { valor: 0, velocidade: 0 };
    let maximo = 0;
    for (let i = 0; i < 300; i++) {
      m = passoDaMola(m, 100, 1 / 60, 0.35, 0.6);
      maximo = Math.max(maximo, m.valor);
    }
    expect(maximo).toBeGreaterThan(100);
    expect(m.valor).toBeCloseTo(100, 1);
  });

  it("herda a velocidade do dedo em vez de começar do zero", () => {
    const parado = passoDaMola({ valor: 0, velocidade: 0 }, 100, 1 / 60);
    const lancado = passoDaMola({ valor: 0, velocidade: 900 }, 100, 1 / 60);
    expect(lancado.valor).toBeGreaterThan(parado.valor);
  });

  it("segura o salto de tempo de uma aba que estava em segundo plano", () => {
    const normal = passoDaMola({ valor: 0, velocidade: 0 }, 100, 1 / 30);
    const saltoDeDoisSegundos = passoDaMola({ valor: 0, velocidade: 0 }, 100, 2);
    expect(saltoDeDoisSegundos).toEqual(normal);
  });
});

describe("resistencia", () => {
  it("deixa passar cada vez menos quanto mais longe", () => {
    const perto = resistencia(10, 100);
    const longe = resistencia(200, 100);
    expect(perto).toBeLessThan(10);
    expect(longe).toBeGreaterThan(perto);
    // Duas vezes mais dedo não dá duas vezes mais movimento.
    expect(resistencia(20, 100)).toBeLessThan(perto * 2);
  });

  it("respeita o sinal e não mexe no zero", () => {
    expect(resistencia(0, 100)).toBe(0);
    expect(Math.sign(resistencia(-30, 100))).toBe(-1);
  });

  it("nunca ultrapassa a própria dimensão", () => {
    expect(Math.abs(resistencia(100000, 100))).toBeLessThan(100);
  });
});
