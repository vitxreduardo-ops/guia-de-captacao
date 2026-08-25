"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import {
  disconnectUserCalendar,
  getUserCalendarAccount,
} from "@/lib/userCalendars";
import {
  clearCalendarCache,
  createGoogleEvent,
  removeAllCardsFromAccount,
  setCalendarSelected,
  syncAllCardsToAccount,
  updateGoogleEvent,
  type EventDraft,
  type EventEdit,
} from "@/lib/googleCalendar";

const PATHS = ["/admin/agenda", "/admin/backlog/calendario"];

function revalidate() {
  for (const path of PATHS) revalidatePath(path);
}

/** Desliga a agenda desta pessoa e limpa o que o app criou lá. */
export async function disconnectCalendarAction() {
  const session = await getCurrentSession();
  if (!session) return;

  const account = await getUserCalendarAccount(session.userId);
  if (account) {
    // Apaga antes de esquecer o token: sem ele não dá mais pra falar com o
    // Google, e os eventos ficariam encalhados na agenda da pessoa.
    await removeAllCardsFromAccount(account);
    await disconnectUserCalendar(session.userId);
    clearCalendarCache(session.userId);
  }
  revalidate();
}

/** Reenvia todos os materiais com data — conserta o que ficou fora de
 * sincronia quando o Google falhou no meio de alguma edição. */
export async function syncMyCalendarAction(): Promise<number> {
  const session = await getCurrentSession();
  if (!session) return 0;

  const account = await getUserCalendarAccount(session.userId);
  if (!account) return 0;

  const synced = await syncAllCardsToAccount(account);
  revalidate();
  return synced;
}


/** Liga/desliga uma agenda — a mesma caixinha que existe no Google. */
export async function toggleCalendarAction(
  calendarId: string,
  selected: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, message: "Sessão expirada." };

  const account = await getUserCalendarAccount(session.userId);
  if (!account) return { ok: false, message: "Agenda não conectada." };

  try {
    await setCalendarSelected(account, calendarId, selected);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível mudar esta agenda.",
    };
  }

  revalidate();
  return { ok: true };
}

/** Cria um compromisso a partir de um horário vazio da grade. */
export async function createEventAction(
  draft: EventDraft
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, message: "Sessão expirada." };

  const account = await getUserCalendarAccount(session.userId);
  if (!account) return { ok: false, message: "Agenda não conectada." };

  try {
    await createGoogleEvent(account, draft);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível criar o compromisso.",
    };
  }

  revalidate();
  return { ok: true };
}

/** Salva a edição de um compromisso feita dentro do app. */
export async function updateEventAction(
  edit: EventEdit
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, message: "Sessão expirada." };

  const account = await getUserCalendarAccount(session.userId);
  if (!account) return { ok: false, message: "Agenda não conectada." };

  try {
    await updateGoogleEvent(account, edit);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o compromisso.",
    };
  }

  revalidate();
  return { ok: true };
}
