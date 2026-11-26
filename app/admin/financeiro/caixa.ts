"use server";

import { revalidatePath } from "next/cache";
import { parseBRLToCents } from "@/lib/billingTypes";
import { getResultadoAno, getFinanceSettings, removeRecurring, removeReserveDeposit, saveRecurring, saveFinanceSettings, setReserveDeposit } from "@/lib/caixa";
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

/**
 * Reserva mínima em caixa: valor em reais, meses de custo, ou os dois (vale o
 * maior). Os dois vazios voltam ao padrão (um mês de custo).
 */
export async function saveReserveMinAction(formData: FormData) {
  await requireFullAccess();
  const rawValor = String(formData.get("valor") ?? "").trim();
  const rawMeses = String(formData.get("meses") ?? "").trim().replace(",", ".");
  const cents = rawValor === "" ? null : parseBRLToCents(rawValor);
  const meses = rawMeses === "" ? null : Number(rawMeses);
  if (meses !== null && (!Number.isFinite(meses) || meses <= 0 || meses > 24)) {
    throw new Error("Os meses de custo vão de 0,5 a 24.");
  }
  await saveFinanceSettings({
    reserveMinCents: cents !== null && cents > 0 ? cents : null,
    reserveMinMonths: meses === null ? null : Math.round(meses * 10) / 10,
  });
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

/** Cliente recorrente da Projeção: quanto cai por mês e em que dia. Vale para novo e para edição. */
export async function saveRecurringAction(formData: FormData) {
  await requireFullAccess();
  const clientId = String(formData.get("cliente") ?? "");
  const cents = parseBRLToCents(formData.get("valor"));
  const dia = Number(formData.get("dia"));
  if (!clientId) throw new Error("Escolha o cliente.");
  if (cents <= 0) throw new Error("Informe o valor mensal.");
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) throw new Error("O dia vai de 1 a 31.");
  await saveRecurring(clientId, cents, dia);
  revalidatePath("/admin/financeiro", "layout");
}

export async function removeRecurringAction(formData: FormData) {
  await requireFullAccess();
  await removeRecurring(String(formData.get("cliente") ?? ""));
  revalidatePath("/admin/financeiro", "layout");
}
