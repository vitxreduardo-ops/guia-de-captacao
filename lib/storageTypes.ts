export type StorageRole = "estudio" | "backup" | "entrega";

export const STORAGE_ROLE_LABELS: Record<StorageRole, string> = {
  estudio: "Em estúdio",
  backup: "Backup",
  entrega: "Entrega",
};

export function normalizeStorageRole(value: unknown): StorageRole {
  return value === "backup" || value === "entrega" ? value : "estudio";
}

export interface StorageLocation {
  id: string;
  name: string;
  role: StorageRole;
  capacityGb: number;
  usedGb: number;
  /** Passou disso, o espaço dispara o alerta de cheio. */
  limitPercent: number;
  /** Lido pelo app do Mac (disco físico). Nulo = espaço cadastrado à mão. */
  deviceKey: string | null;
  connected: boolean;
  readAt: string | null;
}

export interface SubFolder {
  name: string;
  sizeGb: number;
}

export interface StorageItem {
  id: string;
  name: string;
  sizeGb: number;
  locationIds: string[];
  /** Pastas dentro do material, por espaço: o que cada disco tem lá dentro. */
  subfolders: Record<string, SubFolder[]>;
}

/** "1,8 TB" a partir de 1000 GB; abaixo, "179 GB". */
export function formatGb(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1).replace(".", ",")} TB`;
  return `${Math.round(gb)} GB`;
}

/** "1,5" ou "1.5" → 1.5; lixo vira 0. */
export function parseGb(value: unknown): number {
  const n = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function usedPercent(l: StorageLocation): number {
  return Math.round((l.usedGb / l.capacityGb) * 100);
}

export function freeGb(l: StorageLocation): number {
  return Math.max(0, l.capacityGb - l.usedGb);
}

export function isFull(l: StorageLocation): boolean {
  return usedPercent(l) >= l.limitPercent;
}

/** Materiais com menos de duas cópias (contando só lugares que ainda existem). */
export function onlyOnePlace(items: StorageItem[], locations: StorageLocation[]): StorageItem[] {
  const ids = new Set(locations.map((l) => l.id));
  return items.filter((i) => i.locationIds.filter((id) => ids.has(id)).length < 2);
}

export interface ReadFolder {
  name: string;
  sizeGb: number;
  subfolders?: SubFolder[];
}

export interface FolderChange {
  sizeGb: number;
  locationIds: string[];
  subfolders: Record<string, SubFolder[]>;
}

const nameKey = (n: string) => n.normalize("NFC").trim().toLowerCase();

/**
 * Compara as pastas lidas num disco com os materiais cadastrados: pasta de
 * mesmo nome é o mesmo material. Cria o que falta, marca o disco nos que
 * existem e tira o disco dos que sumiram da pasta.
 */
export function reconcileFolders(
  items: StorageItem[],
  locationId: string,
  folders: ReadFolder[]
): {
  creates: (FolderChange & { name: string })[];
  updates: (FolderChange & { id: string })[];
} {
  const byName = new Map(items.map((i) => [nameKey(i.name), i]));
  const seen = new Set<string>();
  const creates: (FolderChange & { name: string })[] = [];
  const updates = new Map<string, FolderChange & { id: string }>();

  for (const f of folders) {
    const key = nameKey(f.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const subs = f.subfolders ?? [];
    const item = byName.get(key);
    if (!item) {
      creates.push({ name: f.name, sizeGb: f.sizeGb, locationIds: [locationId], subfolders: { [locationId]: subs } });
      continue;
    }
    const has = item.locationIds.includes(locationId);
    const mudouSubs = JSON.stringify(item.subfolders[locationId] ?? []) !== JSON.stringify(subs);
    if (!has || mudouSubs || Math.abs(item.sizeGb - f.sizeGb) > 0.01) {
      updates.set(item.id, {
        id: item.id,
        sizeGb: f.sizeGb,
        locationIds: has ? item.locationIds : [...item.locationIds, locationId],
        subfolders: { ...item.subfolders, [locationId]: subs },
      });
    }
  }
  for (const item of items) {
    if (seen.has(nameKey(item.name)) || !item.locationIds.includes(locationId)) continue;
    const resto = { ...item.subfolders };
    delete resto[locationId];
    updates.set(item.id, {
      id: item.id,
      sizeGb: item.sizeGb,
      locationIds: item.locationIds.filter((id) => id !== locationId),
      subfolders: resto,
    });
  }
  return { creates, updates: [...updates.values()] };
}

/** Sem acento nem maiúscula: "Clínica" acha "clinica". */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export interface Resultado {
  item: StorageItem;
  /** Todos os discos onde o material existe. */
  locais: StorageLocation[];
  /** O nome do material bate na busca. */
  pastaBate: boolean;
  /** Subpastas que batem, cada uma no disco em que está. */
  subs: { local: StorageLocation; sub: SubFolder }[];
}

/**
 * Acha materiais e subpastas em todos os discos. Todas as palavras da busca
 * precisam aparecer. Se o material já bate pelo nome, só entram as subpastas
 * que também batem pelo próprio nome — listar todas seria ruído.
 */
export function buscar(items: StorageItem[], locations: StorageLocation[], consulta: string): Resultado[] {
  const termos = normalizarBusca(consulta).split(/\s+/).filter(Boolean);
  if (!termos.length) return [];
  const bate = (texto: string) => {
    const n = normalizarBusca(texto);
    return termos.every((t) => n.includes(t));
  };
  const porId = new Map(locations.map((l) => [l.id, l]));
  const out: Resultado[] = [];
  for (const item of items) {
    const locais = item.locationIds.map((id) => porId.get(id)).filter((l): l is StorageLocation => !!l);
    const pastaBate = bate(item.name);
    const subs: Resultado["subs"] = [];
    for (const local of locais) {
      for (const sub of item.subfolders[local.id] ?? []) {
        if (pastaBate ? bate(sub.name) : bate(`${item.name} ${sub.name}`)) subs.push({ local, sub });
      }
    }
    if (pastaBate || subs.length) out.push({ item, locais, pastaBate, subs });
  }
  return out.sort((a, b) => b.item.sizeGb - a.item.sizeGb);
}
