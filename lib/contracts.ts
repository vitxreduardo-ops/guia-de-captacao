import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { ContractVars } from "@/lib/contractBody";

export type ContractStatus = "draft" | "published" | "signed";
export type ContractKind = "mensal" | "freela";

export interface Contract extends ContractVars {
  id: string;
  slug: string;
  title: string;
  kind: ContractKind;
  is_template: boolean;
  status: ContractStatus;
  client_email: string;
  client_address: string;
  body: string;
  signed_name: string;
  signed_document: string;
  signed_at: string | null;
  signed_ip: string;
  created_at: string;
  updated_at: string;
}

/** Campos que a tela de edição grava. Fora dela ficam `status` e o aceite,
 *  que têm caminho próprio — publicar e assinar não são "salvar um campo". */
export type ContractEditable = Pick<
  Contract,
  | "title"
  | "kind"
  | "client_name"
  | "client_document"
  | "client_email"
  | "client_address"
  | "scope"
  | "price"
  | "payment_terms"
  | "start_date"
  | "duration_months"
  | "body"
>;

async function uniqueSlug(title: string) {
  const supabase = getSupabaseServerClient();
  const base = slugify(title) || "contrato";

  let candidate = base;
  for (let tentativa = 0; tentativa < 10; tentativa += 1) {
    const { data, error } = await supabase
      .from("contracts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now()}`;
}

/** A lista do admin. Modelos ficam de fora: eles não são contratos de
 *  ninguém, e misturados viram dois itens que nunca saem do topo. */
export async function listContracts(): Promise<Contract[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("is_template", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listContractTemplates(): Promise<Contract[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("is_template", true)
    .order("title", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getContract(id: string): Promise<Contract | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getContractBySlug(
  slug: string
): Promise<Contract | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Cria o contrato a partir de um modelo (0054). Sem modelo escolhido, pega o
 * primeiro do mesmo tipo — contrato em branco é o que faz a ferramenta não
 * ser usada, e escrever as nove cláusulas do zero é justamente o trabalho que
 * ela existe pra evitar.
 */
export async function createContract(
  title: string,
  kind: ContractKind,
  templateId?: string
): Promise<Contract> {
  const supabase = getSupabaseServerClient();

  const templates = await listContractTemplates();
  const template = templateId
    ? templates.find((t) => t.id === templateId)
    : templates.find((t) => t.kind === kind);

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      title: title || "Novo contrato",
      slug: await uniqueSlug(title),
      kind,
      body: template?.body ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateContract(
  id: string,
  fields: Partial<ContractEditable>
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("contracts")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Publica ou volta pra rascunho.
 *
 * Contrato assinado não volta: o aceite do cliente é sobre o texto que estava
 * no ar no momento do clique, e despublicar pra reescrever apagaria o que ele
 * aceitou sem deixar rastro. Pra mudar depois de assinado, faz-se outro.
 */
export async function setContractStatus(
  id: string,
  status: Exclude<ContractStatus, "signed">
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("contracts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "signed");

  if (error) throw error;
}

/**
 * Registra o aceite do cliente.
 *
 * O `eq("status", "published")` é a trava: só é aceitável o que está no ar, e
 * quem já assinou não assina de novo (o status vira `signed` e o filtro não
 * casa mais). Devolve se gravou, pra tela saber o que dizer.
 */
export async function signContract(
  slug: string,
  name: string,
  document: string,
  ip: string
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts")
    .update({
      status: "signed",
      signed_name: name,
      signed_document: document,
      signed_at: new Date().toISOString(),
      signed_ip: ip,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
    .eq("status", "published")
    .select("id");

  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function deleteContract(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("contracts")
    .delete()
    .eq("id", id)
    .eq("is_template", false);

  if (error) throw error;
}
