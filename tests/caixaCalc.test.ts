import { describe, expect, it } from "vitest";
import { doMes, faixaDe, fimDoMes, livreParaGastar, projetar, reserva, simular, somarMeses } from "@/lib/caixaCalc";

const base = projetar({
  hoje: "2026-11-22",
  caixa: 100_00,
  entradas: [
    { date: "2026-11-10", cents: 20_00 }, // vencida: entra no mês corrente
    { date: "2026-12-05", cents: 50_00 },
    { date: null, cents: 999_00 }, // sem dia: fora da conta
    { date: "2027-06-01", cents: 1_00 }, // depois do horizonte
  ],
  saidas: [
    { date: "2026-11-30", cents: 30_00 },
    { date: "2026-12-15", cents: 90_00 },
  ],
});

describe("caixaCalc", () => {
  it("soma meses virando o ano", () => {
    expect(somarMeses("2026-12-01", 1)).toBe("2027-01-01");
    expect(somarMeses("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("projeta o caixa mês a mês e acha o ponto mais baixo", () => {
    expect(base.meses.map((m) => m.fim)).toEqual([90_00, 50_00, 50_00, 50_00, 50_00, 50_00]);
    expect(base.menorCents).toBe(50_00);
    expect(base.menorMes).toBe("2026-12-01");
    expect(base.semDataCents).toBe(999_00);
  });

  it("calcula reserva e quanto está livre", () => {
    // sem nada definido: um mês de custo
    const r = reserva({ caixa: 100_00, custoMensal: 40_00, minCents: null, minMeses: null });
    expect(r).toEqual({ minimaCents: 40_00, origem: "padrao", folgaCents: 60_00, meses: 2.5 });
    // valor fixo: o custo não manda no piso
    expect(reserva({ caixa: 100_00, custoMensal: 40_00, minCents: 50_00, minMeses: null })).toMatchObject({ minimaCents: 50_00, origem: "valor" });
    // meses de custo
    expect(reserva({ caixa: 100_00, custoMensal: 40_00, minCents: null, minMeses: 2 })).toMatchObject({ minimaCents: 80_00, origem: "meses" });
    // os dois juntos: vale o maior
    expect(reserva({ caixa: 100_00, custoMensal: 40_00, minCents: 50_00, minMeses: 2 })).toMatchObject({ minimaCents: 80_00, origem: "ambos" });
    expect(reserva({ caixa: 100_00, custoMensal: 40_00, minCents: 200_00, minMeses: 2 })).toMatchObject({ minimaCents: 200_00, origem: "ambos", folgaCents: -100_00 });
    expect(reserva({ caixa: 1, custoMensal: 0, minCents: null, minMeses: null }).meses).toBeNull();
    expect(livreParaGastar(base.menorCents, r.minimaCents)).toBe(10_00);
    expect(livreParaGastar(10_00, 40_00)).toBe(0);
  });

  it("simula uma vez, parcelado e todo mês", () => {
    const uma = simular(base, { cents: 20_00, tipo: "uma", mes: "2026-12-01" }, 40_00);
    expect(uma.fim.slice(0, 3)).toEqual([90_00, 30_00, 30_00]);
    expect(uma.cabe).toBe(false);

    const parc = simular(base, { cents: 5_00, tipo: "parcelado", mes: "2026-12-01", parcelas: 2 }, 40_00);
    expect(parc.fim.slice(0, 4)).toEqual([90_00, 45_00, 40_00, 40_00]);
    expect(parc.cabe).toBe(true);

    const mes = simular(base, { cents: 1_00, tipo: "mensal", mes: "2027-01-01" }, 0);
    // jan, fev, mar e abr: quatro meses de R$ 1 saem do último ponto.
    expect(mes.fim.at(-1)).toBe(50_00 - 4_00);
  });

  it("separa por urgência e acha o fim do mês", () => {
    const hoje = "2026-11-22";
    expect(faixaDe("2026-11-21", hoje)).toBe("atrasado");
    expect(faixaDe("2026-11-22", hoje)).toBe("semana");
    expect(faixaDe("2026-11-28", hoje)).toBe("semana");
    expect(faixaDe("2026-11-29", hoje)).toBe("mes");
    expect(faixaDe("2026-12-01", hoje)).toBe("depois");
    expect(faixaDe(null, hoje)).toBe("semData");
    expect(fimDoMes("2026-02-10")).toBe("2026-02-28");
  });

  it("filtra as contas por mês sem somar as dos meses seguintes", () => {
    const hoje = "2026-11-22";
    const contas = ["2026-10-30", "2026-11-25", "2026-12-05", "2027-01-05"];
    const d = (s: string) => s;
    // mês corrente: o vencido e o que vence em novembro
    expect(doMes(contas, d, "2026-11-01", hoje)).toEqual(["2026-10-30", "2026-11-25"]);
    expect(doMes(contas, d, "2026-12-01", hoje)).toEqual(["2026-12-05"]);
  });
});
