import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { MeuNivel, NivelCliente } from "@/lib/budgetCalc";

export type BudgetStatus = "draft" | "published";

export interface Budget {
  id: string;
  slug: string;
  title: string;
  client_name: string;
  client_whatsapp: string;
  status: BudgetStatus;
  hero_eyebrow: string;
  hero_title1: string;
  hero_title2: string;
  hero_subtitle: string;
  hero_cta: string;
  hero_bg_video_url: string;
  about_title: string;
  about_text: string;
  highlights_title: string;
  calc_meu_nivel: MeuNivel;
  calc_nivel_cliente: NivelCliente;
  calc_estrategia: number;
  calc_videos: number;
  calc_resultado: number;
  calc_extras: number;
  calc_margem_pct: number;
  calc_tax_pct: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetHighlight {
  id: string;
  budget_id: string;
  position: number;
  title: string;
}

export interface BudgetPackage {
  id: string;
  budget_id: string;
  position: number;
  name: string;
  price: number;
  tag: string;
  features: string;
}

export interface BudgetFaq {
  id: string;
  budget_id: string;
  position: number;
  question: string;
  answer: string;
}

export interface BudgetReference {
  id: string;
  budget_id: string;
  position: number;
  image_url: string;
  source_url: string | null;
  caption: string;
}

export interface BudgetWithSections extends Budget {
  highlights: BudgetHighlight[];
  packages: BudgetPackage[];
  faq: BudgetFaq[];
  references: BudgetReference[];
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function generateUniqueBudgetSlug(title: string) {
  const supabase = getSupabaseServerClient();
  const base = slugify(title) || "orcamento";

  let candidate = base;
  let attempt = 0;

  while (true) {
    const { data, error } = await supabase
      .from("budgets")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    attempt += 1;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (attempt > 10) {
      candidate = `${base}-${Date.now()}`;
      return candidate;
    }
  }
}

async function nextPosition(table: string, column: string, value: string) {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);

  if (error) throw error;
  return count ?? 0;
}

export async function listBudgets(): Promise<Budget[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function attachSections(budget: Budget): Promise<BudgetWithSections> {
  const supabase = getSupabaseServerClient();

  const [highlights, packages, faq, references] = await Promise.all([
    supabase
      .from("budget_highlights")
      .select("*")
      .eq("budget_id", budget.id)
      .order("position", { ascending: true }),
    supabase
      .from("budget_packages")
      .select("*")
      .eq("budget_id", budget.id)
      .order("position", { ascending: true }),
    supabase
      .from("budget_faq")
      .select("*")
      .eq("budget_id", budget.id)
      .order("position", { ascending: true }),
    supabase
      .from("budget_references")
      .select("*")
      .eq("budget_id", budget.id)
      .order("position", { ascending: true }),
  ]);

  if (highlights.error) throw highlights.error;
  if (packages.error) throw packages.error;
  if (faq.error) throw faq.error;
  if (references.error) throw references.error;

  return {
    ...budget,
    highlights: highlights.data ?? [],
    packages: packages.data ?? [],
    faq: faq.data ?? [],
    references: references.data ?? [],
  };
}

export async function getBudgetWithSections(
  id: string
): Promise<BudgetWithSections | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return attachSections(data);
}

export async function getBudgetBySlugWithSections(
  slug: string
): Promise<BudgetWithSections | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return attachSections(data);
}

const DEFAULT_ABOUT_TITLE =
  "Sua empresa não precisa só aparecer. Precisa ser reconhecida.";
const DEFAULT_ABOUT_TEXT =
  "Unimos estratégia, direção criativa e produção audiovisual para construir uma presença coerente.";
const DEFAULT_HIGHLIGHTS = [
  "Direção criativa acompanhando toda a operação",
  "Conteúdo para orgânico e tráfego",
  "Banco de imagens para desdobrar em vários conteúdos",
  "Alinhamento mensal de performance para guiar a próxima pauta",
];

export async function createBudget(title: string): Promise<Budget> {
  const supabase = getSupabaseServerClient();
  const slug = await generateUniqueBudgetSlug(title || "novo-orcamento");

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      title: title || "Novo orçamento",
      slug,
      about_title: DEFAULT_ABOUT_TITLE,
      about_text: DEFAULT_ABOUT_TEXT,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: highlightsError } = await supabase
    .from("budget_highlights")
    .insert(
      DEFAULT_HIGHLIGHTS.map((title, position) => ({
        budget_id: data.id,
        position,
        title,
      }))
    );
  if (highlightsError) throw highlightsError;

  return data;
}

export async function updateBudgetInfo(
  id: string,
  fields: Partial<
    Pick<
      Budget,
      | "title"
      | "client_name"
      | "client_whatsapp"
      | "hero_eyebrow"
      | "hero_title1"
      | "hero_title2"
      | "hero_subtitle"
      | "hero_cta"
      | "hero_bg_video_url"
      | "about_title"
      | "about_text"
      | "highlights_title"
    >
  >
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budgets")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function updateBudgetCalc(
  id: string,
  fields: Partial<
    Pick<
      Budget,
      | "calc_meu_nivel"
      | "calc_nivel_cliente"
      | "calc_estrategia"
      | "calc_videos"
      | "calc_resultado"
      | "calc_extras"
      | "calc_margem_pct"
      | "calc_tax_pct"
    >
  >
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budgets")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function setBudgetStatus(id: string, status: BudgetStatus) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budgets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBudget(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
}

// Destaques

export async function addBudgetHighlight(budgetId: string, title: string) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition("budget_highlights", "budget_id", budgetId);
  const { error } = await supabase
    .from("budget_highlights")
    .insert({ budget_id: budgetId, position, title });
  if (error) throw error;
}

export async function updateBudgetHighlight(id: string, title: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budget_highlights")
    .update({ title })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBudgetHighlight(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budget_highlights")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Pacotes

export async function addBudgetPackage(
  budgetId: string,
  fields: { name: string; price: number; tag?: string; features?: string }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition("budget_packages", "budget_id", budgetId);
  const { error } = await supabase.from("budget_packages").insert({
    budget_id: budgetId,
    position,
    name: fields.name,
    price: fields.price,
    tag: fields.tag ?? "",
    features: fields.features ?? "",
  });
  if (error) throw error;
}

export async function updateBudgetPackage(
  id: string,
  fields: { name: string; price: number; tag: string; features: string }
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budget_packages")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBudgetPackage(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budget_packages")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function replaceBudgetPackages(
  budgetId: string,
  packages: { name: string; price: number; tag?: string; features?: string }[]
) {
  const supabase = getSupabaseServerClient();
  const { error: deleteError } = await supabase
    .from("budget_packages")
    .delete()
    .eq("budget_id", budgetId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("budget_packages").insert(
    packages.map((pkg, index) => ({
      budget_id: budgetId,
      position: index,
      name: pkg.name,
      price: pkg.price,
      tag: pkg.tag ?? "",
      features: pkg.features ?? "",
    }))
  );
  if (insertError) throw insertError;
}

// FAQ

export async function addBudgetFaq(
  budgetId: string,
  fields: { question: string; answer: string }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition("budget_faq", "budget_id", budgetId);
  const { error } = await supabase.from("budget_faq").insert({
    budget_id: budgetId,
    position,
    question: fields.question,
    answer: fields.answer,
  });
  if (error) throw error;
}

export async function updateBudgetFaq(
  id: string,
  fields: { question: string; answer: string }
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budget_faq")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBudgetFaq(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("budget_faq").delete().eq("id", id);
  if (error) throw error;
}

// Referências

export async function addBudgetReference(
  budgetId: string,
  fields: { image_url: string; source_url?: string | null; caption: string }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition(
    "budget_references",
    "budget_id",
    budgetId
  );
  const { error } = await supabase.from("budget_references").insert({
    budget_id: budgetId,
    position,
    image_url: fields.image_url,
    source_url: fields.source_url ?? null,
    caption: fields.caption,
  });
  if (error) throw error;
}

export async function deleteBudgetReference(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("budget_references")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
