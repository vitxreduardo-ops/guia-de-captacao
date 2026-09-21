import "server-only";
import { getBillingDue, type BillingDue } from "@/lib/billing";
import { getProspects } from "@/lib/prospects";
import { todayISO, type ProspectRow } from "@/lib/prospectTypes";

/** Quantos dias pra frente o Painel olha. Sete cobre a semana: lembrete que
 *  só aparece no dia do vencimento chega junto com o atraso. */
export const REMINDER_WINDOW_DAYS = 7;

export interface Reminders {
  today: string;
  /** Contatos com próximo passo marcado pra hoje ou pra trás. */
  followups: ProspectRow[];
  /** Pagamentos vencidos ou vencendo dentro da janela. */
  payments: BillingDue[];
}

/**
 * O que precisa de você hoje, em duas listas.
 *
 * Mora no Painel porque as duas coisas moram em telas que não se abre todo
 * dia: follow-up atrasado é o vazamento silencioso do funil, e pagamento em
 * aberto só aparece quando alguém vai conferir. Nenhum dos dois grita
 * sozinho.
 */
export async function getReminders(): Promise<Reminders> {
  const today = todayISO();

  const [board, payments] = await Promise.all([
    getProspects(),
    getBillingDue(REMINDER_WINDOW_DAYS),
  ]);

  const followups = board.prospects
    .filter(
      (prospect) =>
        // Fechado e perdido não têm próximo passo; nutrição tem, e é
        // justamente a data que faz o "não agora" voltar.
        prospect.stage.kind !== "ganha" &&
        prospect.stage.kind !== "perdida" &&
        prospect.next_contact_date !== null &&
        prospect.next_contact_date <= today
    )
    .sort((a, b) =>
      (a.next_contact_date ?? "").localeCompare(b.next_contact_date ?? "")
    );

  return { today, followups, payments };
}
