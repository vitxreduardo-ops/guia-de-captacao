"use server";

import { revalidatePath } from "next/cache";
import {
  getContract,
  setContractStatus,
  updateContract,
  type ContractKind,
} from "@/lib/contracts";

function revalidateContract(id: string, slug?: string | null) {
  revalidatePath(`/admin/contratos/${id}`);
  revalidatePath("/admin/contratos");
  if (slug) revalidatePath(`/contrato/${slug}`);
}

/** `""` vira null: coluna `date` recusa string vazia, e o campo em branco é
 *  justamente o caso normal enquanto o contrato é rascunho. */
function dateOrNull(value: FormDataEntryValue | null) {
  const texto = String(value ?? "").trim();
  return texto ? texto : null;
}

function intOrNull(value: FormDataEntryValue | null) {
  const numero = Number(String(value ?? "").trim());
  return Number.isFinite(numero) && numero > 0 ? Math.trunc(numero) : null;
}

/** Aceita "2.500,00" e "2500.00": o formulário é digitado à mão e as duas
 *  formas aparecem. Sem isso, `Number("2.500,00")` é NaN e o valor vira 0. */
function priceFromForm(value: FormDataEntryValue | null) {
  const texto = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
  if (!texto) return 0;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

export async function updateContractAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const contract = await getContract(id);
  if (!contract) return;

  // Assinado não se edita: o cliente aceitou este texto, e reescrever por
  // cima transformaria o aceite em registro de outra coisa.
  if (contract.status === "signed") return;

  const kind: ContractKind =
    String(formData.get("kind")) === "freela" ? "freela" : "mensal";

  await updateContract(id, {
    title: String(formData.get("title") ?? "").trim() || "Novo contrato",
    kind,
    client_name: String(formData.get("client_name") ?? "").trim(),
    client_document: String(formData.get("client_document") ?? "").trim(),
    client_email: String(formData.get("client_email") ?? "").trim(),
    client_address: String(formData.get("client_address") ?? "").trim(),
    scope: String(formData.get("scope") ?? "").trim(),
    price: priceFromForm(formData.get("price")),
    payment_terms: String(formData.get("payment_terms") ?? "").trim(),
    start_date: dateOrNull(formData.get("start_date")),
    duration_months: intOrNull(formData.get("duration_months")),
    body: String(formData.get("body") ?? ""),
  });

  revalidateContract(id, contract.slug);
}

export async function setContractStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "draft" && status !== "published")) return;

  const contract = await getContract(id);
  if (!contract) return;

  await setContractStatus(id, status);
  revalidateContract(id, contract.slug);
}
