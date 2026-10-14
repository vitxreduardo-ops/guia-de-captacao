"use server";

import { revalidatePath } from "next/cache";
import {
  getContract,
  listContractRevisions,
  setContractStatus,
  updateContract,
  type ContractKind,
} from "@/lib/contracts";
import { requireTeam } from "@/lib/session";

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
  const texto = String(value ?? "")
    .trim()
    .replace(/[^\d,.-]/g, "");
  if (!texto) return 0;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

export type SalvarResultado = { ok: true } | { ok: false; motivo: string };

/**
 * Chamada pelo salvamento automático do editor, a cada pausa na digitação.
 * Nunca redireciona nem recarrega a página: com a sessão vencida, o redirect
 * levaria ao login e o que está na tela se perderia. Em vez disso devolve o
 * motivo, e o editor segura o texto e avisa. Por isso também não faz
 * `revalidatePath` da própria tela — o estado dela é o que o usuário digitou.
 */
export async function updateContractAction(
  formData: FormData,
): Promise<SalvarResultado> {
  try {
    await requireTeam("contratos");
  } catch {
    return {
      ok: false,
      motivo: "Sessão expirada. Entre de novo em outra aba.",
    };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, motivo: "Contrato sem id." };

  try {
    const contract = await getContract(id);
    if (!contract) return { ok: false, motivo: "Contrato não encontrado." };

    // Assinado não se edita: o cliente aceitou este texto, e reescrever por
    // cima transformaria o aceite em registro de outra coisa.
    if (contract.status === "signed") {
      return { ok: false, motivo: "Contrato já assinado." };
    }

    const kind: ContractKind =
      String(formData.get("kind")) === "freela" ? "freela" : "mensal";

    await updateContract(id, {
      // Título apagado no meio da digitação não vira "Novo contrato" no banco.
      ...(String(formData.get("title") ?? "").trim()
        ? { title: String(formData.get("title")).trim() }
        : {}),
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

    revalidatePath("/admin/contratos");
    if (contract.slug) revalidatePath(`/contrato/${contract.slug}`);
    return { ok: true };
  } catch {
    return { ok: false, motivo: "Não consegui gravar no banco." };
  }
}

export async function setContractStatusAction(formData: FormData) {
  await requireTeam("contratos");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "draft" && status !== "published")) return;

  const contract = await getContract(id);
  if (!contract) return;

  await setContractStatus(id, status);
  revalidateContract(id, contract.slug);
}

/** Volta o texto e o título para uma versão guardada. O gatilho do banco
 *  guarda o que está valendo agora antes de trocar, então dá pra desfazer. */
export async function restoreRevisionAction(
  contractId: string,
  revisionId: string,
): Promise<SalvarResultado> {
  try {
    await requireTeam("contratos");
  } catch {
    return {
      ok: false,
      motivo: "Sessão expirada. Entre de novo em outra aba.",
    };
  }
  const contract = await getContract(contractId);
  if (!contract || contract.status === "signed") {
    return { ok: false, motivo: "Contrato não pode ser alterado." };
  }
  const revisao = (await listContractRevisions(contractId)).find(
    (r) => r.id === revisionId,
  );
  if (!revisao) return { ok: false, motivo: "Versão não encontrada." };

  await updateContract(contractId, {
    title: revisao.title,
    body: revisao.body,
  });
  revalidateContract(contractId, contract.slug);
  return { ok: true };
}
