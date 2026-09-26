import { describe, expect, it } from "vitest";
import { agruparPorCliente, SEM_CLIENTE } from "@/lib/guideFolders";
import type { Guide } from "@/lib/guides";

function guia(id: string, client_name: string, shoot_date: string | null, created_at = "2026-01-01"): Guide {
  return { id, slug: id, title: id, client_name, shoot_date, location: "", status: "draft", tags: [], created_at, updated_at: created_at };
}

describe("agruparPorCliente", () => {
  const pastas = agruparPorCliente(
    [
      guia("eci-dez", "ECI", "2026-12-05"),
      guia("sem", "", null),
      guia("eci-out", "ECI ", "2026-10-01"),
      guia("14bis", "14Bis", null),
      guia("eci-sem-data", "ECI", null),
      guia("eci-dez2", "ECI", "2026-12-20"),
    ],
    "2026-11-01"
  );

  it("uma pasta por cliente, alfabética, Sem cliente no fim", () => {
    expect(pastas.map((p) => p.cliente)).toEqual(["14Bis", "ECI", SEM_CLIENTE]);
  });

  it("meses em ordem de data e guias sem data por último", () => {
    const eci = pastas[1];
    expect(eci.total).toBe(4);
    expect(eci.meses.map((m) => m.chave)).toEqual(["2026-10", "2026-12", "sem-data"]);
    expect(eci.meses[1].guias.map((g) => g.id)).toEqual(["eci-dez", "eci-dez2"]);
  });

  it("próxima gravação ignora datas passadas", () => {
    expect(pastas[1].proxima).toBe("2026-12-05");
    expect(pastas[0].proxima).toBeNull();
  });
});
