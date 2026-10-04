"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createContract,
  deleteContract,
  type ContractKind,
} from "@/lib/contracts";
import { requireTeam } from "@/lib/session";

export async function createContractAction(formData: FormData) {
  await requireTeam("contratos");
  const title = String(formData.get("title") ?? "").trim();
  const kind: ContractKind =
    String(formData.get("kind")) === "freela" ? "freela" : "mensal";

  const contract = await createContract(title || "Novo contrato", kind);
  revalidatePath("/admin/contratos");
  redirect(`/admin/contratos/${contract.id}`);
}

export async function deleteContractAction(formData: FormData) {
  await requireTeam("contratos");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteContract(id);
  revalidatePath("/admin/contratos");
}
