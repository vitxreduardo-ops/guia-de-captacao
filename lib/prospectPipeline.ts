/**
 * As contas do painel comercial: o funil visto pelo lado do dinheiro.
 *
 * Tudo aqui é função pura sobre as linhas que a tela já carregou — nada de
 * `sum()` no Postgres. São dezenas de contatos, não milhões, e a soma em
 * memória é a mesma que já está na tela, sem uma segunda fonte de verdade
 * pra divergir da lista logo acima do número.
 *
 * ponytail: soma em memória; virar agregação no banco se o funil passar de
 * alguns milhares de contatos.
 */
import type { ProspectRow, ProspectStage } from "@/lib/prospectTypes";

export interface StageTotal {
  stage: ProspectStage;
  count: number;
  value: number;
}

/** Quanto há em cada etapa, na ordem do funil. Etapa vazia aparece também:
 *  o buraco no meio do funil é informação. */
export function totalsByStage(
  rows: ProspectRow[],
  stages: ProspectStage[]
): StageTotal[] {
  return [...stages]
    .sort((a, b) => a.position - b.position)
    .map((stage) => {
      const doEstagio = rows.filter((row) => row.stage_id === stage.id);
      return {
        stage,
        count: doEstagio.length,
        value: somaValor(doEstagio),
      };
    });
}

/**
 * O que ainda está em jogo: só as etapas em andamento.
 *
 * Fechado e perdido ficam de fora por motivos opostos e igualmente óbvios —
 * um já é receita, o outro nunca vai ser. Nutrição também sai: é o "não
 * agora", e somá-lo infla o funil com dinheiro que ninguém está perseguindo.
 */
export function openPipeline(rows: ProspectRow[]): {
  count: number;
  value: number;
} {
  const abertos = rows.filter((row) => row.stage.kind === "ativa");
  return { count: abertos.length, value: somaValor(abertos) };
}

/** Fechado no mês `AAAA-MM`. Usa `closed_at`, não `updated_at`. */
export function wonInMonth(
  rows: ProspectRow[],
  month: string
): { count: number; value: number } {
  const ganhos = rows.filter(
    (row) =>
      row.stage.kind === "ganha" &&
      (row.closed_at ?? "").slice(0, 7) === month
  );
  return { count: ganhos.length, value: somaValor(ganhos) };
}

/**
 * Quantos por cento do que foi decidido virou cliente.
 *
 * O denominador é ganhos + perdidos, não o funil inteiro: contato ainda em
 * conversa não é fracasso, e contá-lo faz a taxa despencar toda vez que se
 * prospecta mais — o oposto do que o número deveria dizer. `null` quando nada
 * foi decidido ainda, pra tela poder dizer isso em vez de mostrar 0%.
 */
export function conversionRate(rows: ProspectRow[]): number | null {
  const ganhos = rows.filter((row) => row.stage.kind === "ganha").length;
  const perdidos = rows.filter((row) => row.stage.kind === "perdida").length;
  const decididos = ganhos + perdidos;
  return decididos === 0 ? null : ganhos / decididos;
}

/** Por que não fecha, do mais comum pro menos. Sem motivo escrito não entra:
 *  uma fatia "—" grande esconde justamente o que se quer descobrir. */
export function lostReasons(
  rows: ProspectRow[]
): { reason: string; count: number }[] {
  const contagem = new Map<string, number>();

  for (const row of rows) {
    if (row.stage.kind !== "perdida") continue;
    const motivo = row.lost_reason.trim();
    if (!motivo) continue;
    contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

/** Contatos em etapa ativa sem valor: o funil não sabe quanto eles valem, e
 *  é por isso que a soma acima sempre parece baixa. */
export function missingValue(rows: ProspectRow[]): ProspectRow[] {
  return rows.filter((row) => row.stage.kind === "ativa" && row.value <= 0);
}

function somaValor(rows: ProspectRow[]): number {
  return rows.reduce((total, row) => total + (Number(row.value) || 0), 0);
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatBRL(value: number): string {
  return BRL.format(value);
}

/** Mês corrente como `AAAA-MM`, no fuso do estúdio. */
export function currentMonth(timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}
