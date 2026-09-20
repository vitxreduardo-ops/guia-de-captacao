/**
 * O gerador de abordagem: a primeira mensagem, montada a partir do que o
 * Radar já sabe sobre a empresa.
 *
 * Conta pura, como `followupText` — e pelo mesmo motivo: é onde dá pra errar
 * calado. Sugerir "vi que vocês não postam" pra quem posta todo dia não
 * derruba nada, só queima o contato.
 */
import type { RadarCompany } from "@/lib/prospectTypes";

export const OUTREACH_ANGLES = [
  "indicacao",
  "conteudo_fraco",
  "sem_conteudo",
  "elogio",
  "frio",
] as const;
export type OutreachAngle = (typeof OUTREACH_ANGLES)[number];

export const ANGLE_LABELS: Record<OutreachAngle, string> = {
  indicacao: "Veio por indicação",
  conteudo_fraco: "Posta, mas sem direção",
  sem_conteudo: "Não posta nada",
  elogio: "Posta bem",
  frio: "Só sei o ramo",
};

export interface OutreachTemplate {
  id: string;
  name: string;
  angle: OutreachAngle;
  position: number;
  body: string;
}

export function normalizeAngle(value: unknown): OutreachAngle {
  return OUTREACH_ANGLES.includes(value as OutreachAngle)
    ? (value as OutreachAngle)
    : "frio";
}

/**
 * Qual ângulo a empresa oferece.
 *
 * A indicação vence tudo: um nome conhecido na primeira linha é a diferença
 * entre ser lido e ser ignorado, e nenhuma observação sobre o perfil chega
 * perto disso.
 *
 * "Não sei" e "ainda não olhei" caem no frio de propósito — os dois são
 * ausência de informação, e chutar em cima deles é o único jeito de a
 * mensagem sair dizendo algo falso sobre o perfil da pessoa.
 */
export function suggestAngle(
  company: Pick<RadarCompany, "referral" | "produces_content">
): OutreachAngle {
  if (company.referral.trim()) return "indicacao";
  if (company.produces_content === "nao") return "sem_conteudo";
  if (company.produces_content === "as_vezes") return "conteudo_fraco";
  if (company.produces_content === "sim") return "elogio";
  return "frio";
}

export interface OutreachVars {
  empresa: string;
  /** Com quem se fala. Sem nome anotado, a linha que o usa sai fora — é
   *  melhor do que abrir com "Oi, ,". */
  pessoa: string;
  ramo: string;
  indicacao: string;
  perfil: string;
}

export function outreachVars(company: RadarCompany): OutreachVars {
  return {
    empresa: company.company,
    pessoa: company.comms_name.trim() || company.contact.trim(),
    ramo: company.sector.trim().toLowerCase(),
    indicacao: company.referral.trim(),
    perfil: company.instagram.trim(),
  };
}

/**
 * Preenche o modelo. Mesma regra do follow-up: linha com variável vazia sai
 * inteira, porque é a mensagem que vai pra alguém que nunca ouviu falar da
 * gente, e um buraco nela é a primeira impressão.
 */
export function renderOutreach(body: string, vars: OutreachVars): string {
  const valores: Record<string, string> = { ...vars };

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
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
