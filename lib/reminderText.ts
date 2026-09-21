/**
 * Como um lembrete se descreve. Conta pura, testada em
 * `tests/reminderText.test.ts` — a diferença entre "hoje" e "atrasado" muda o
 * que a pessoa faz em seguida, e errar isso por um dia é errar o recado.
 */

export type DueStatus = "vencido" | "hoje" | "proximo";

/** Compara só o calendário: as duas datas são AAAA-MM-DD, então a ordem
 *  alfabética já é a ordem cronológica — sem `Date`, sem fuso. */
export function dueStatus(dueISO: string, todayISO: string): DueStatus {
  if (dueISO < todayISO) return "vencido";
  if (dueISO === todayISO) return "hoje";
  return "proximo";
}

/** Dias inteiros entre duas datas de calendário. */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * O prazo em palavras.
 *
 * "Há 1 dia" e "amanhã" dizem mais do que a data: quem lê o Painel de manhã
 * não quer converter 19/09 em "anteontem" de cabeça.
 */
export function dueLabel(dueISO: string, todayISO: string): string {
  const status = dueStatus(dueISO, todayISO);
  if (status === "hoje") return "hoje";

  if (status === "vencido") {
    const dias = daysBetween(dueISO, todayISO);
    return dias === 1 ? "ontem" : `há ${dias} dias`;
  }

  const dias = daysBetween(todayISO, dueISO);
  return dias === 1 ? "amanhã" : `em ${dias} dias`;
}

/** A linha de resumo do bloco. O plural é escrito à mão porque "1 follow-ups"
 *  é o tipo de detalhe que faz o painel parecer inacabado. */
export function remindersSummary(
  followups: number,
  payments: number
): string | null {
  const partes: string[] = [];
  if (followups > 0) {
    partes.push(
      followups === 1 ? "1 follow-up pra fazer" : `${followups} follow-ups pra fazer`
    );
  }
  if (payments > 0) {
    partes.push(
      payments === 1 ? "1 pagamento em aberto" : `${payments} pagamentos em aberto`
    );
  }
  return partes.length === 0 ? null : partes.join(" · ");
}
