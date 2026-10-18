import { describe, expect, it } from "vitest";
import {
  formatGb,
  isFull,
  onlyOnePlace,
  buscar,
  parseGb,
  reconcileFolders,
  usedPercent,
  type StorageItem,
  type StorageLocation,
} from "@/lib/storageTypes";

const loc = (id: string, usedGb: number, limitPercent = 80): StorageLocation => ({
  id,
  name: id,
  role: "estudio",
  capacityGb: 2000,
  usedGb,
  limitPercent,
  deviceKey: null,
  connected: true,
  readAt: null,
});

describe("armazenamento", () => {
  it("avisa quando passa do limite combinado", () => {
    expect(usedPercent(loc("a", 1820))).toBe(91);
    expect(isFull(loc("a", 1820))).toBe(true);
    expect(isFull(loc("a", 1000))).toBe(false);
    expect(isFull(loc("a", 1000, 50))).toBe(true);
  });

  it("acha material com uma cópia só, ignorando lugar apagado", () => {
    const locs = [loc("a", 0), loc("b", 0)];
    const items = [
      { id: "1", name: "dois", sizeGb: 1, locationIds: ["a", "b"], subfolders: {} },
      { id: "2", name: "um", sizeGb: 1, locationIds: ["a"], subfolders: {} },
      { id: "3", name: "um + apagado", sizeGb: 1, locationIds: ["a", "x"], subfolders: {} },
      { id: "4", name: "nenhum", sizeGb: 1, locationIds: [], subfolders: {} },
    ];
    expect(onlyOnePlace(items, locs).map((i) => i.id)).toEqual(["2", "3", "4"]);
  });

  it("formata e lê tamanhos", () => {
    expect(formatGb(1800)).toBe("1,8 TB");
    expect(formatGb(179)).toBe("179 GB");
    expect(parseGb("1,5")).toBe(1.5);
    expect(parseGb("abc")).toBe(0);
  });

  it("concilia pastas lidas com os materiais e guarda as subpastas por disco", () => {
    const items: StorageItem[] = [
      { id: "1", name: "Clinica", sizeGb: 10, locationIds: ["b"], subfolders: { b: [{ name: "Bruto", sizeGb: 9 }] } },
      { id: "2", name: "Antigo", sizeGb: 5, locationIds: ["a", "b"], subfolders: { a: [{ name: "X", sizeGb: 1 }] } },
    ];
    const r = reconcileFolders(items, "a", [
      { name: "CLINICA", sizeGb: 12, subfolders: [{ name: "Final", sizeGb: 2 }] },
      { name: "Novo", sizeGb: 3 },
    ]);
    expect(r.creates).toEqual([{ name: "Novo", sizeGb: 3, locationIds: ["a"], subfolders: { a: [] } }]);
    expect(r.updates).toContainEqual({
      id: "1",
      sizeGb: 12,
      locationIds: ["b", "a"],
      subfolders: { b: [{ name: "Bruto", sizeGb: 9 }], a: [{ name: "Final", sizeGb: 2 }] },
    });
    expect(r.updates).toContainEqual({ id: "2", sizeGb: 5, locationIds: ["b"], subfolders: {} });
  });

  it("busca pasta e subpasta em todos os discos, sem acento", () => {
    const locs = [loc("a", 0), loc("b", 0)];
    const items: StorageItem[] = [
      { id: "1", name: "Clínica Sorriso", sizeGb: 10, locationIds: ["a", "b"], subfolders: { a: [{ name: "Bruto", sizeGb: 8 }], b: [{ name: "Final", sizeGb: 2 }] } },
      { id: "2", name: "Marcus", sizeGb: 50, locationIds: ["a"], subfolders: { a: [{ name: "Tawane", sizeGb: 20 }, { name: "Itacare", sizeGb: 5 }] } },
      { id: "3", name: "Outro", sizeGb: 1, locationIds: ["b"], subfolders: {} },
    ];
    const porNome = buscar(items, locs, "clinica");
    expect(porNome.map((r) => r.item.id)).toEqual(["1"]);
    expect(porNome[0].locais.map((l) => l.id)).toEqual(["a", "b"]);
    expect(porNome[0].subs).toEqual([]);
    const porSub = buscar(items, locs, "tawane");
    expect(porSub.map((r) => r.item.id)).toEqual(["2"]);
    expect(porSub[0].subs.map((s) => s.sub.name)).toEqual(["Tawane"]);
    expect(buscar(items, locs, "marcus itacare")[0].subs.map((s) => s.sub.name)).toEqual(["Itacare"]);
    expect(buscar(items, locs, "  ")).toEqual([]);
  });
});
