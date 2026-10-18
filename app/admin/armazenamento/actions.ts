"use server";

import { revalidatePath } from "next/cache";
import {
  addItem,
  addLocation,
  deleteItem,
  deleteLocation,
  listStorage,
  setItemLocations,
  updateLocationUsed,
} from "@/lib/armazenamento";
import { normalizeStorageRole, parseGb } from "@/lib/storageTypes";
import { requireTeam } from "@/lib/session";

const done = () => revalidatePath("/admin/armazenamento");

export async function addLocationAction(formData: FormData) {
  await requireTeam("armazenamento");
  const name = String(formData.get("nome") ?? "").trim();
  const capacityGb = parseGb(formData.get("capacidade")) * (formData.get("unidade") === "TB" ? 1000 : 1);
  if (!name || !capacityGb) return;
  const usedGb = parseGb(formData.get("usado")) * (formData.get("unidade") === "TB" ? 1000 : 1);
  const limit = Math.round(parseGb(formData.get("limite"))) || 80;
  await addLocation({
    name,
    role: normalizeStorageRole(formData.get("papel")),
    capacityGb,
    usedGb,
    limitPercent: Math.min(100, limit),
  });
  done();
}

export async function updateUsedAction(formData: FormData) {
  await requireTeam("armazenamento");
  const unit = formData.get("unidade") === "TB" ? 1000 : 1;
  await updateLocationUsed(String(formData.get("id")), parseGb(formData.get("usado")) * unit);
  done();
}

export async function deleteLocationAction(formData: FormData) {
  await requireTeam("armazenamento");
  await deleteLocation(String(formData.get("id")));
  done();
}

export async function addItemAction(formData: FormData) {
  await requireTeam("armazenamento");
  const name = String(formData.get("nome") ?? "").trim();
  if (!name) return;
  await addItem({
    name,
    sizeGb: parseGb(formData.get("tamanho")),
    locationIds: formData.getAll("lugares").map(String),
  });
  done();
}

/** Marca "tem cópia aqui" num material, direto da lista de avisos. */
export async function addCopyAction(formData: FormData) {
  await requireTeam("armazenamento");
  const id = String(formData.get("id"));
  const where = String(formData.get("lugar"));
  const { items } = await listStorage();
  const item = items.find((i) => i.id === id);
  if (!item || !where || item.locationIds.includes(where)) return;
  await setItemLocations(id, [...item.locationIds, where]);
  done();
}

export async function deleteItemAction(formData: FormData) {
  await requireTeam("armazenamento");
  await deleteItem(String(formData.get("id")));
  done();
}
