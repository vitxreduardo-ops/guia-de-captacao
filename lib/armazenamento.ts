import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  reconcileFolders,
  type ReadFolder,
  normalizeStorageRole,
  type StorageItem,
  type StorageLocation,
  type StorageRole,
} from "@/lib/storageTypes";

export async function listStorage(): Promise<{
  locations: StorageLocation[];
  items: StorageItem[];
}> {
  const db = getSupabaseServerClient();
  const [locs, items] = await Promise.all([
    db.from("storage_locations").select("*").order("created_at"),
    db.from("storage_items").select("*").order("created_at", { ascending: false }),
  ]);
  if (locs.error) throw locs.error;
  if (items.error) throw items.error;
  return {
    locations: (locs.data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      role: normalizeStorageRole(r.role),
      capacityGb: Number(r.capacity_gb),
      usedGb: Number(r.used_gb),
      limitPercent: r.limit_percent as number,
      deviceKey: (r.device_key as string | null) ?? null,
      connected: r.connected as boolean,
      readAt: (r.read_at as string | null) ?? null,
    })),
    items: (items.data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      sizeGb: Number(r.size_gb),
      locationIds: (r.location_ids as string[]) ?? [],
      subfolders: (r.subfolders as StorageItem["subfolders"]) ?? {},
    })),
  };
}

export async function addLocation(f: {
  name: string;
  role: StorageRole;
  capacityGb: number;
  usedGb: number;
  limitPercent: number;
}) {
  const { error } = await getSupabaseServerClient()
    .from("storage_locations")
    .insert({
      name: f.name,
      role: f.role,
      capacity_gb: f.capacityGb,
      used_gb: f.usedGb,
      limit_percent: f.limitPercent,
    });
  if (error) throw error;
}

export async function updateLocationUsed(id: string, usedGb: number) {
  const { error } = await getSupabaseServerClient()
    .from("storage_locations")
    .update({ used_gb: usedGb })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLocation(id: string) {
  const { error } = await getSupabaseServerClient().from("storage_locations").delete().eq("id", id);
  if (error) throw error;
}

export async function addItem(f: { name: string; sizeGb: number; locationIds: string[] }) {
  const { error } = await getSupabaseServerClient()
    .from("storage_items")
    .insert({ name: f.name, size_gb: f.sizeGb, location_ids: f.locationIds });
  if (error) throw error;
}

export async function setItemLocations(id: string, locationIds: string[]) {
  const { error } = await getSupabaseServerClient()
    .from("storage_items")
    .update({ location_ids: locationIds })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await getSupabaseServerClient().from("storage_items").delete().eq("id", id);
  if (error) throw error;
}

export interface ReadVolume {
  key: string;
  name: string;
  capacityGb: number;
  usedGb: number;
  /** Só vem quando o app terminou de ler as pastas do disco. */
  folders?: ReadFolder[];
}

/** Aplica o que o app do Mac leu: espaços, quanto usam e os materiais de cada disco. */
export async function applyReading(volumes: ReadVolume[]) {
  const db = getSupabaseServerClient();
  const { locations, items: allItems } = await listStorage();
  let items = allItems;
  const now = new Date().toISOString();
  const keys = new Set(volumes.map((v) => v.key));

  for (const l of locations) {
    if (l.deviceKey && l.connected && !keys.has(l.deviceKey)) {
      await db.from("storage_locations").update({ connected: false }).eq("id", l.id);
    }
  }

  for (const v of volumes) {
    const fields = { capacity_gb: v.capacityGb, used_gb: v.usedGb, connected: true, read_at: now };
    let id = locations.find((l) => l.deviceKey === v.key)?.id;
    if (id) {
      const { error } = await db.from("storage_locations").update(fields).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await db
        .from("storage_locations")
        .insert({ ...fields, name: v.name, device_key: v.key })
        .select("id")
        .single();
      if (error) throw error;
      id = data.id as string;
    }
    if (!v.folders) continue;

    const { creates, updates } = reconcileFolders(items, id, v.folders);
    if (creates.length) {
      const { error } = await db.from("storage_items").insert(
        creates.map((c) => ({
          name: c.name,
          size_gb: c.sizeGb,
          location_ids: c.locationIds,
          subfolders: c.subfolders,
        }))
      );
      if (error) throw error;
    }
    for (const u of updates) {
      const { error } = await db
        .from("storage_items")
        .update({ size_gb: u.sizeGb, location_ids: u.locationIds, subfolders: u.subfolders })
        .eq("id", u.id);
      if (error) throw error;
    }
    if (creates.length || updates.length) items = (await listStorage()).items;
  }
}
