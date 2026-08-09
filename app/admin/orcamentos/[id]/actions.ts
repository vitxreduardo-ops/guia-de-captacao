"use server";

import { revalidatePath } from "next/cache";
import {
  addBudgetFaq,
  addBudgetHighlight,
  addBudgetPackage,
  deleteBudgetFaq,
  deleteBudgetHighlight,
  deleteBudgetPackage,
  getBudgetWithSections,
  replaceBudgetPackages,
  setBudgetStatus,
  updateBudgetCalc,
  updateBudgetFaq,
  updateBudgetHighlight,
  updateBudgetInfo,
  updateBudgetPackage,
  type BudgetStatus,
} from "@/lib/budgets";
import {
  computeFreela,
  computeRecorrente,
  packagesFromRecomendado,
  type MeuNivel,
  type NivelCliente,
} from "@/lib/budgetCalc";

function revalidateBudget(id: string, slug?: string | null) {
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin/orcamentos");
  if (slug) revalidatePath(`/orcamento/${slug}`);
}

export async function updateBudgetInfoAction(formData: FormData) {
  const id = String(formData.get("id"));

  await updateBudgetInfo(id, {
    title: String(formData.get("title") ?? "").trim() || "Sem título",
    client_name: String(formData.get("client_name") ?? "").trim(),
    client_whatsapp: String(formData.get("client_whatsapp") ?? "").trim(),
    hero_eyebrow: String(formData.get("hero_eyebrow") ?? "").trim(),
    hero_title1: String(formData.get("hero_title1") ?? "").trim(),
    hero_title2: String(formData.get("hero_title2") ?? "").trim(),
    hero_subtitle: String(formData.get("hero_subtitle") ?? "").trim(),
    hero_cta: String(formData.get("hero_cta") ?? "").trim(),
    hero_bg_video_url: String(formData.get("hero_bg_video_url") ?? "").trim(),
    about_title: String(formData.get("about_title") ?? "").trim(),
    about_text: String(formData.get("about_text") ?? "").trim(),
    highlights_title: String(formData.get("highlights_title") ?? "").trim(),
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

  await replaceBudgetPackages(id, [
    {
      name: "Start",
      price: start,
      tag: "",
      features: "Escopo enxuto\nEdite os itens deste pacote",
    },
    {
      name: "Ideal",
      price: ideal,
      tag: "MAIS ESCOLHIDO",
      features: "Gerado pela calculadora\nEdite os itens deste pacote",
    },
    {
      name: "Pro",
      price: pro,
      tag: "",
      features: "Escopo ampliado\nEdite os itens deste pacote",
    },
  ]);

  const budget = await getBudgetWithSections(id);
  revalidateBudget(id, budget?.slug);
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

  await addBudgetPackage(budgetId, {
    name: label,
    price: Math.round(price),
    tag: "SOB MEDIDA",
    features: "Escopo fechado sob medida\nSem recorrência obrigatória",
  });

  const budget = await getBudgetWithSections(budgetId);
  revalidateBudget(budgetId, budget?.slug);
}

// Destaques

export async function addBudgetHighlightAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await addBudgetHighlight(budgetId, title);
  revalidateBudget(budgetId);
}

export async function updateBudgetHighlightAction(formData: FormData) {
  const id = String(formData.get("id"));
  const budgetId = String(formData.get("budget_id"));
  const title = String(formData.get("title") ?? "").trim();
  await updateBudgetHighlight(id, title);
  revalidateBudget(budgetId);
}

export async function deleteBudgetHighlightAction(formData: FormData) {
  const id = String(formData.get("id"));
  const budgetId = String(formData.get("budget_id"));
  await deleteBudgetHighlight(id);
  revalidateBudget(budgetId);
}

// Pacotes

export async function addBudgetPackageAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await addBudgetPackage(budgetId, {
    name,
    price: Number(formData.get("price")) || 0,
    tag: String(formData.get("tag") ?? "").trim(),
    features: String(formData.get("features") ?? "").trim(),
  });
  revalidateBudget(budgetId);
}

export async function updateBudgetPackageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const budgetId = String(formData.get("budget_id"));
  await updateBudgetPackage(id, {
    name: String(formData.get("name") ?? "").trim(),
    price: Number(formData.get("price")) || 0,
    tag: String(formData.get("tag") ?? "").trim(),
    features: String(formData.get("features") ?? "").trim(),
  });
  revalidateBudget(budgetId);
}

export async function deleteBudgetPackageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const budgetId = String(formData.get("budget_id"));
  await deleteBudgetPackage(id);
  revalidateBudget(budgetId);
}

// FAQ

export async function addBudgetFaqAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id"));
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return;
  await addBudgetFaq(budgetId, {
    question,
    answer: String(formData.get("answer") ?? "").trim(),
  });
  revalidateBudget(budgetId);
}

export async function updateBudgetFaqAction(formData: FormData) {
  const id = String(formData.get("id"));
  const budgetId = String(formData.get("budget_id"));
  await updateBudgetFaq(id, {
    question: String(formData.get("question") ?? "").trim(),
    answer: String(formData.get("answer") ?? "").trim(),
  });
  revalidateBudget(budgetId);
}

export async function deleteBudgetFaqAction(formData: FormData) {
  const id = String(formData.get("id"));
  const budgetId = String(formData.get("budget_id"));
  await deleteBudgetFaq(id);
  revalidateBudget(budgetId);
}
