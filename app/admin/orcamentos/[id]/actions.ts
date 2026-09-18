"use server";

import { revalidatePath } from "next/cache";
import {
  getBudgetWithSections,
  setBudgetStatus,
  updateBudgetCalc,
  updateBudgetInfo,
  updateBudgetSections,
  type BudgetStatus,
} from "@/lib/budgets";
import { parseSections } from "@/lib/budgetSections";
import {
  computeFreela,
  computeRecorrente,
  packagesFromRecomendado,
  type MeuNivel,
  type NivelCliente,
} from "@/lib/budgetCalc";
import { uploadBudgetReferenceImage } from "@/lib/storage";
import {
  addClientLogo,
  deleteClientLogo,
  listClientLogos,
  renameClientLogo,
  type ClientLogoRecord,
} from "@/lib/clientLogos";

function revalidateBudget(id: string, slug?: string | null) {
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin/orcamentos");
  if (slug) revalidatePath(`/orcamento/${slug}`);
}

/**
 * Grava as seções que o editor mandou.
 *
 * O que chega do cliente passa por parseSections antes de ir para o banco: é a
 * mesma normalização da leitura, então campo faltando ganha default e campo do
 * tipo errado não entra. Uma action não confia no que o navegador manda.
 */
export async function saveBudgetSectionsAction(id: string, sections: unknown) {
  await updateBudgetSections(id, parseSections(sections));

  const budget = await getBudgetWithSections(id);
  revalidateBudget(id, budget?.slug);
}

/**
 * Teto do upload. Cobre foto de capa em resolução de tela com folga; acima
 * disto é arquivo que não foi tratado, e a proposta ia demorar a abrir no
 * celular do cliente.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Sobe um arquivo do computador e devolve a URL pública.
 *
 * Reusa o bucket das referências (uploads ficam em budgets/{id}/ dentro dele),
 * então não há storage novo para configurar. Quem chama costura a URL no lugar
 * certo da seção e o autosave grava — o upload em si não mexe no orçamento.
 */
export async function uploadBudgetMediaAction(
  budgetId: string,
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Nenhum arquivo recebido." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Só imagem: PNG, JPG, SVG ou WebP." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Arquivo grande demais — o limite é 10 MB." };
  }

  try {
    const url = await uploadBudgetReferenceImage(budgetId, file);
    return { url };
  } catch (error) {
    console.error("[uploadBudgetMediaAction] falhou:", error);
    return { error: "Não foi possível enviar o arquivo." };
  }
}

// Biblioteca de logos

export async function listClientLogosAction(): Promise<ClientLogoRecord[]> {
  return listClientLogos();
}

/**
 * Sobe um logo e guarda no acervo de uma vez: quem está montando a proposta
 * não deveria ter que cadastrar o logo num lugar e escolhê-lo em outro.
 */
export async function uploadClientLogoAction(
  budgetId: string,
  formData: FormData
): Promise<{ logo: ClientLogoRecord } | { error: string }> {
  const nome = String(formData.get("name") ?? "").trim();
  const enviado = await uploadBudgetMediaAction(budgetId, formData);

  if ("error" in enviado) return enviado;

  const logo = await addClientLogo({ name: nome, logo_url: enviado.url });
  return { logo };
}

export async function renameClientLogoAction(id: string, name: string) {
  await renameClientLogo(id, name.trim());
}

export async function deleteClientLogoAction(id: string) {
  await deleteClientLogo(id);
}

export async function updateBudgetInfoAction(formData: FormData) {
  const id = String(formData.get("id"));

  await updateBudgetInfo(id, {
    title: String(formData.get("title") ?? "").trim() || "Sem título",
    client_name: String(formData.get("client_name") ?? "").trim(),
    client_whatsapp: String(formData.get("client_whatsapp") ?? "").trim(),
  });

  const budget = await getBudgetWithSections(id);
  revalidateBudget(id, budget?.slug);
}

export async function setBudgetStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as BudgetStatus;
  await setBudgetStatus(id, status);
  const budget = await getBudgetWithSections(id);
  revalidateBudget(id, budget?.slug);
}

function calcFieldsFromFormData(formData: FormData) {
  return {
    calc_meu_nivel: String(formData.get("calc_meu_nivel")) as MeuNivel,
    calc_nivel_cliente: String(
      formData.get("calc_nivel_cliente")
    ) as NivelCliente,
    calc_estrategia: Number(formData.get("calc_estrategia")) || 0,
    calc_videos: Number(formData.get("calc_videos")) || 0,
    calc_resultado: Number(formData.get("calc_resultado")) || 0,
    calc_extras: Number(formData.get("calc_extras")) || 0,
    calc_margem_pct: Number(formData.get("calc_margem_pct")) || 0,
    calc_tax_pct: Number(formData.get("calc_tax_pct")) || 0,
  };
}

export async function updateBudgetCalcAction(formData: FormData) {
  const id = String(formData.get("id"));
  await updateBudgetCalc(id, calcFieldsFromFormData(formData));
  const budget = await getBudgetWithSections(id);
  revalidateBudget(id, budget?.slug);
}

export async function generatePackagesFromCalcAction(formData: FormData) {
  const id = String(formData.get("id"));
  const fields = calcFieldsFromFormData(formData);
  await updateBudgetCalc(id, fields);

  const result = computeRecorrente({
    meuNivel: fields.calc_meu_nivel,
    nivelCliente: fields.calc_nivel_cliente,
    estrategia: fields.calc_estrategia,
    videos: fields.calc_videos,
    resultado: fields.calc_resultado,
    extras: fields.calc_extras,
    margemPct: fields.calc_margem_pct,
    taxPct: fields.calc_tax_pct,
  });
  const { start, ideal, pro } = packagesFromRecomendado(result.recomendado);

  const budget = await getBudgetWithSections(id);
  if (!budget) return;

  // A calculadora escreve na seção de valores, que é onde os pacotes moram
  // agora. Ela troca os três pacotes e não encosta no resto da seção: a
  // etiqueta, o título e o texto do botão são escolha de quem escreveu a
  // proposta, não resultado de conta.
  const pricing = budget.sections.map((section) =>
    section.kind === "pricing"
      ? {
          ...section,
          enabled: true,
          data: {
            ...section.data,
            packages: [
              {
                name: "Start",
                price: start,
                subtitle: "",
                description: "",
                features: ["Escopo enxuto", "Edite os itens deste pacote"],
                featured: false,
              },
              {
                name: "Ideal",
                price: ideal,
                subtitle: "campeão de vendas",
                description: "",
                features: [
                  "Gerado pela calculadora",
                  "Edite os itens deste pacote",
                ],
                featured: true,
              },
              {
                name: "Pro",
                price: pro,
                subtitle: "",
                description: "",
                features: ["Escopo ampliado", "Edite os itens deste pacote"],
                featured: false,
              },
            ],
          },
        }
      : section
  );

  await updateBudgetSections(id, parseSections(pricing));
  revalidateBudget(id, budget.slug);
}

export async function addFreelaAsPackageAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id"));
  const label = String(formData.get("label") ?? "").trim() || "Job avulso";

  const price = computeFreela({
    daily: Number(formData.get("daily")) || 0,
    days: Number(formData.get("days")) || 0,
    strategy: Number(formData.get("strategy")) || 0,
    traffic: Number(formData.get("traffic")) || 0,
    marginPct: Number(formData.get("marginPct")) || 0,
    taxPct: Number(formData.get("taxPct")) || 0,
  });

  const budget = await getBudgetWithSections(budgetId);
  if (!budget) return;

  // O job avulso entra como mais um pacote, no fim da lista — os que já
  // estavam ali continuam onde estavam.
  const comFreela = budget.sections.map((section) =>
    section.kind === "pricing"
      ? {
          ...section,
          enabled: true,
          data: {
            ...section.data,
            packages: [
              ...section.data.packages,
              {
                name: label,
                price: Math.round(price),
                subtitle: "sob medida",
                description: "",
                features: [
                  "Escopo fechado sob medida",
                  "Sem recorrência obrigatória",
                ],
                featured: false,
              },
            ],
          },
        }
      : section
  );

  await updateBudgetSections(budgetId, parseSections(comFreela));
  revalidateBudget(budgetId, budget.slug);
}

// Destaques




// Pacotes




// FAQ




// Referências



