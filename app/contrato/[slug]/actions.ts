"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { signContract } from "@/lib/contracts";

export type SignState = { erro?: string; ok?: boolean };

/**
 * O aceite do cliente.
 *
 * Nome e documento são exigidos aqui, e não só no `required` do formulário:
 * um POST montado à mão não passa pelo HTML, e um aceite sem nome não
 * identifica ninguém.
 */
export async function signContractAction(
  _estado: SignState,
  formData: FormData
): Promise<SignState> {
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("signed_name") ?? "").trim();
  const document = String(formData.get("signed_document") ?? "").trim();

  if (!slug) return { erro: "Contrato não encontrado." };
  if (!name) return { erro: "Preencha seu nome completo." };
  if (!document) return { erro: "Preencha seu CPF ou CNPJ." };

  // Atrás da Vercel o IP real vem no `x-forwarded-for`, que é uma lista: o
  // primeiro é o cliente, os demais são os proxies do caminho.
  const cabecalhos = await headers();
  const ip = (cabecalhos.get("x-forwarded-for") ?? "").split(",")[0].trim();

  const gravou = await signContract(slug, name, document, ip);

  if (!gravou) {
    return {
      erro: "Este contrato já foi aceito ou não está mais disponível.",
    };
  }

  revalidatePath(`/contrato/${slug}`);
  revalidatePath("/admin/contratos");
  return { ok: true };
}
