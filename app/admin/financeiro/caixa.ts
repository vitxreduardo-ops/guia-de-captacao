"use server";

import { revalidatePath } from "next/cache";
import { parseBRLToCents } from "@/lib/billingTypes";
import { getResultadoAno, getFinanceSettings, removeReserveDeposit, saveFinanceSettings, setReserveDeposit } from "@/lib/caixa";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { requireTeam } from "@/lib/session";

/** Saldo e metas são do estúdio todo: só quem vê todos os clientes mexe. */
async function requireFullAccess() {
  await requireTeam("financeiro");
  if ((await getCurrentClientScope()) !== null) {
    throw new Error("Só quem tem acesso a todos os clientes mexe no caixa.");
  }
}

/** "Conferi o saldo": o app soma o que entra e sai a partir de amanhã. */
export async function saveCashAction(formData: FormData) {
  await requireFullAccess();
  const raw = String(formData.get("valor") ?? "");
  const negativo = raw.trim().startsWith("-");
  const cents = parseBRLToCents(raw.replace("-", ""));
  await saveFinanceSettings({
    cashCents: negativo ? -cents : cents,
    cashOn: new Date().toLocaleDateString("sv-SE"),
    cashAt: new Date().toISOString(),
  });
  revalidatePath("/admin/financeiro", "layout");
}

/** Meta de faturamento do mês (o que entra), em reais. Vazio apaga a meta. */
export async function saveRevenueGoalAction(formData: FormData) {
  await requireFullAccess();
  const cents = parseBRLToCents(formData.get("valor"));
  await saveFinanceSettings({ revenueGoalCents: cents > 0 ? cents : null });
  revalidatePath("/admin/financeiro", "layout");
}

/** % do que entra que vira reserva estimada (6 ou 6,5). */
export async function saveReserveRateAction(formData: FormData) {
  await requireFullAccess();
  const pct = Number(String(formData.get("valor") ?? "").replace(",", "."));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error("A porcentagem vai de 0 a 100%.");
  await saveFinanceSettings({ reserveRateBps: Math.round(pct * 100) });
  revalidatePath("/admin/financeiro", "layout");
}

/** Meta de reserva, em meses de custo. */
export async function saveReserveGoalAction(formData: FormData) {
  await requireFullAccess();
  const months = Number(String(formData.get("valor") ?? "").replace(",", "."));
  if (!Number.isFinite(months) || months <= 0 || months > 24) throw new Error("A meta vai de 0,5 a 24 meses.");
  await saveFinanceSettings({ reserveGoalMonths: Math.round(months * 10) / 10 });
  revalidatePath("/admin/financeiro", "layout");
}

/** Quanto já tem guardado na reserva. */
export async function saveReserveBaseAction(formData: FormData) {
  await requireFullAccess();
  await saveFinanceSettings({ reserveBaseCents: parseBRLToCents(formData.get("valor")) });
  revalidatePath("/admin/financeiro", "layout");
}

function readMonth(formData: FormData): string {
  const m = String(formData.get("mes") ?? "");
  if (!/^\d{4}-\d{2}/.test(m)) throw new Error("Mês inválido.");
  return `${m.slice(0, 7)}-01`;
}

/**
 * "Reserva feita": o valor guardado é a reserva estimada do mês (% sobre o
 * que entrou), calculada aqui no servidor no momento do toque.
 */
export async function markReserveDoneAction(formData: FormData) {
  await requireFullAccess();
  const month = readMonth(formData);
  const [settings, ano] = await Promise.all([getFinanceSettings(), getResultadoAno(Number(month.slice(0, 4)))]);
  const entrou = ano.entrou[Number(month.slice(5, 7)) - 1];
  await setReserveDeposit(month, Math.round((entrou * settings.reserveRateBps) / 10_000));
  revalidatePath("/admin/financeiro", "layout");
}

export async function unmarkReserveDoneAction(formData: FormData) {
  await requireFullAccess();
  await removeReserveDeposit(readMonth(formData));
  revalidatePath("/admin/financeiro", "layout");
}
