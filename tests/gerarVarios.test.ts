import { beforeEach, describe, expect, it, vi } from "vitest";

const chatJson = vi.fn();
const insertRoteiro = vi.fn();

vi.mock("@/lib/session", () => ({
  requireTeam: async () => ({}),
  getCurrentSession: async () => ({ userId: "u" }),
}));
vi.mock("@/lib/roteiroAi", () => ({
  chatJson: (a: unknown) => chatJson(a),
  chatConversaJson: vi.fn(),
  MODELO_ROTEIRO: "m",
  MODELO_TRIAGEM: "t",
}));
vi.mock("@/lib/roteiros", () => ({
  insertRoteiro: (r: unknown) => insertRoteiro(r),
  getRoteiro: vi.fn(),
  updateRoteiro: vi.fn(),
}));
vi.mock("@/lib/roteiroContexto", () => ({
  clientePermitido: async () => false,
  contextoDoCliente: vi.fn(),
  perfilDoCliente: vi.fn(),
  salvarDescricaoDoCliente: vi.fn(),
}));
vi.mock("@/lib/guides", () => ({ addScene: vi.fn(), addVideo: vi.fn(), listGuides: vi.fn() }));
vi.mock("@/lib/galleries", () => ({ createGalleryClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { gerarVariosAction } from "@/app/admin/roteiros/actions";

const base = {
  framework: "@startupdareal" as const,
  comum: { tema: "T", objetivo: "O", contexto: "", duracaoSegundos: 60, tom: "", nicho: "" },
  extra: { angulos: { Emocional: "nada" } },
  tags: ["x"],
};

describe("gerarVariosAction", () => {
  beforeEach(() => {
    chatJson.mockReset().mockResolvedValue({ termometro: [] });
    insertRoteiro.mockReset().mockResolvedValue("id");
  });

  it("gera a quantidade pedida de cada ângulo, com o ângulo em forte e como tag", async () => {
    const res = await gerarVariosAction({ ...base, pedidos: { Polemico: 2, Bastidores: 1, Prova: 0, Inventado: 3 } as never });
    if (!res.ok) throw new Error(res.error);
    expect(res.data.map((i) => [i.angulo, i.indice, i.total])).toEqual([
      ["Polemico", 1, 2],
      ["Polemico", 2, 2],
      ["Bastidores", 1, 1],
    ]);
    expect(chatJson).toHaveBeenCalledTimes(3);
    const systems = chatJson.mock.calls.map((c) => c[0].system as string);
    expect(systems[0]).toContain("- Polemico: forte");
    expect(systems[0]).toContain("- Emocional: nada");
    expect(systems[0]).toContain("roteiro 1 de 2");
    expect(systems[1]).toContain("roteiro 2 de 2");
    expect(systems[2]).not.toContain("VARIAÇÃO");
    expect(insertRoteiro.mock.calls[2][0].tags).toEqual(["x", "Bastidores"]);
  });

  it("falha de um roteiro não derruba os outros", async () => {
    chatJson.mockRejectedValueOnce(new Error("quebrou")).mockResolvedValueOnce({ termometro: [] });
    const res = await gerarVariosAction({ ...base, pedidos: { Prova: 1, Bastidores: 1 } });
    if (!res.ok) throw new Error(res.error);
    expect(res.data[0].resultado).toEqual({ ok: false, error: "quebrou" });
    expect(res.data[1].resultado.ok).toBe(true);
  });

  it("vale pra outros frameworks: AIDA recebe o ângulo e a variação no prompt", async () => {
    const aida = { ...base, framework: "AIDA" as const, extra: { cta: "Salvar", numHooks: 2 } };
    const res = await gerarVariosAction({ ...aida, pedidos: { Prova: 2 } });
    if (!res.ok) throw new Error(res.error);
    expect(res.data).toHaveLength(2);
    const [s1, s2] = chatJson.mock.calls.map((c) => c[0].system as string);
    expect(s1).toContain("ÂNGULO DESTE ROTEIRO: Prova");
    expect(s1).toContain("roteiro 1 de 2");
    expect(s2).toContain("roteiro 2 de 2");
  });

  it("6 Chapéus: cada roteiro pede só o ângulo dele", async () => {
    await gerarVariosAction({ ...base, framework: "6Chapeus", extra: { angulos: ["Educacional", "Prova"] }, pedidos: { Bastidores: 1 } });
    const s = chatJson.mock.calls[0][0].system as string;
    expect(s).toContain("ÂNGULOS A GERAR NESTA RODADA: Bastidores");
    expect(s).not.toContain("ÂNGULO DESTE ROTEIRO");
  });

  it("Personalizado: segue o framework escrito e o guarda no roteiro", async () => {
    chatJson.mockResolvedValue({ etapas: [{ nome: "Gancho", texto: "g" }] });
    const descricao = "1. Gancho: abre com uma pergunta. 2. Virada: mostra o jeito certo.";
    const res = await gerarVariosAction({ ...base, framework: "Personalizado", extra: { descricao }, pedidos: { Prova: 1 } });
    if (!res.ok) throw new Error(res.error);
    expect(chatJson.mock.calls[0][0].system).toContain(descricao);
    expect(insertRoteiro.mock.calls[0][0].roteiro).toMatchObject({ etapas: [{ nome: "Gancho" }], descricao });
  });

  it("Personalizado sem framework escrito não chama a IA", async () => {
    const res = await gerarVariosAction({ ...base, framework: "Personalizado", extra: { descricao: " curto " }, pedidos: { Prova: 1 } });
    if (!res.ok) throw new Error(res.error);
    expect(res.data[0].resultado.ok).toBe(false);
    expect(chatJson).not.toHaveBeenCalled();
  });

  it("recusa pedido vazio e mais de 10 no total", async () => {
    expect((await gerarVariosAction({ ...base, pedidos: {} })).ok).toBe(false);
    expect((await gerarVariosAction({ ...base, pedidos: { Prova: 6, Educacional: 5 } })).ok).toBe(false);
    expect(chatJson).not.toHaveBeenCalled();
  });
});
