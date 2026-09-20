/**
 * O gerador de follow-up: qual mensagem cabe e como ela fica preenchida.
 *
 * Conta pura, fora do `server-only`, porque é o que a tela precisa recalcular
 * a cada troca de modelo sem ir ao servidor — e porque é onde dá pra errar
 * calado (o texto sai com "faz 0 dias", ou sugere cobrar decisão de quem
 * nunca respondeu). Testado em `tests/followupText.test.ts`.
 */
import type { ProspectRow } from "@/lib/prospectTypes";

export const FOLLOWUP_SITUATIONS = [
  "sem_resposta",
  "pos_conversa",
  "pos_proposta",
  "decisao",
  "nutricao",
  "reativar",
] as const;
export type FollowupSituation = (typeof FOLLOWUP_SITUATIONS)[number];

export const SITUATION_LABELS: Record<FollowupSituation, string> = {
  sem_resposta: "Mandei e não voltou",
  pos_conversa: "Depois da conversa",
  pos_proposta: "Proposta sem retorno",
  decisao: "Esperando decisão",
  nutricao: "Não agora — voltar na data",
  reativar: "Sumiu faz tempo",
};

export interface FollowupTemplate {
  id: string;
  name: string;
  situation: FollowupSituation;
  position: number;
  body: string;
}

export function normalizeSituation(value: unknown): FollowupSituation {
  return FOLLOWUP_SITUATIONS.includes(value as FollowupSituation)
    ? (value as FollowupSituation)
    : "sem_resposta";
}

/** Dias inteiros entre o último registro e hoje. `null` quando nunca houve
 *  contato: é diferente de zero, e o texto não pode dizer "faz 0 dias". */
export function daysSinceTouch(
  lastTouchAt: string | null,
  now: Date = new Date()
): number | null {
  if (!lastTouchAt) return null;
  const decorrido = now.getTime() - Date.parse(lastTouchAt);
  if (!Number.isFinite(decorrido)) return null;
  return Math.max(0, Math.floor(decorrido / 86_400_000));
}

/**
 * Qual situação o contato está vivendo agora.
 *
 * A ordem das perguntas é a regra: a etapa manda quando ela já diz o que
 * aconteceu (nutrição, proposta enviada), e o tempo manda no resto. Sessenta
 * dias parados viram "reativar" mesmo dentro do funil — mandar "e aí, fechou?"
 * depois de dois meses é pedir para não receber resposta.
 */
export function suggestSituation(
  prospect: Pick<ProspectRow, "stage" | "touch_count" | "notes">,
  dias: number | null
): FollowupSituation {
  if (prospect.stage.kind === "nutricao") return "nutricao";
  if (dias !== null && dias >= 60) return "reativar";

  const etapa = prospect.stage.name.toLowerCase();
  if (etapa.includes("proposta")) return "pos_proposta";
  if (etapa.includes("negocia")) return "decisao";
  if (etapa.includes("conversa") || etapa.includes("diagn"))
    return "pos_conversa";

  // Nunca ninguém registrou nada: o contato foi cadastrado e ficou. Cobrar
  // resposta de quem talvez nunca tenha recebido mensagem é o erro clássico.
  if (prospect.touch_count === 0) return "sem_resposta";
  return "sem_resposta";
}

export interface FollowupVars {
  /** Com quem se fala. Cai no nome do contato quando não há pessoa anotada. */
  nome: string;
  empresa: string;
  dias: number | null;
  combinado: string;
  valor: number;
}

export function followupVars(prospect: ProspectRow, dias: number | null) {
  return {
    nome: prospect.contact_name.trim() || prospect.name,
    empresa: prospect.name,
    dias,
    combinado: prospect.next_contact_what,
    valor: prospect.value,
  };
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Preenche o modelo.
 *
 * Variável sem valor deixa a frase inteira de fora, e não um buraco no meio
 * da mensagem: "Fiquei de ." é pior do que um parágrafo a menos, e esta é a
 * mensagem que vai pro cliente sem passar por revisão.
 */
export function renderFollowup(body: string, vars: FollowupVars): string {
  const valores: Record<string, string> = {
    nome: vars.nome,
    empresa: vars.empresa,
    dias: vars.dias === null ? "" : String(vars.dias),
    combinado: vars.combinado,
    valor: vars.valor > 0 ? BRL.format(vars.valor) : "",
  };

  return body
    .split("\n")
    .filter((linha) => {
      const usadas = [...linha.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      return usadas.every((chave) => valores[chave]?.trim());
    })
    .join("\n")
    .replace(/\{\{(\w+)\}\}/g, (original, chave: string) => {
      const valor = valores[chave];
      return valor ? valor : original;
    })
    // Tirar uma linha pode deixar três quebras seguidas onde havia um
    // parágrafo: no WhatsApp isso vira um buraco no meio da mensagem.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Link do WhatsApp com a mensagem já escrita. Sem telefone não há link —
 *  `wa.me` sem número abre a busca de contato, que não ajuda ninguém. */
export function whatsappLink(phone: string, message: string): string | null {
  const digitos = phone.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const comPais = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(message)}`;
}
