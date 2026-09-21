/**
 * O gerador de mensagens: qual texto cabe agora e como ele fica preenchido.
 *
 * Um só para os dois lugares onde se escreve — a ficha do contato e a empresa
 * do Radar. Antes eram dois geradores separados pela pessoa já te conhecer ou
 * não, e essa divisão não decidia nada: o que decide o texto é o que você quer
 * que aconteça em seguida.
 *
 * Conta pura, fora do `server-only`, porque a tela recalcula a cada troca de
 * modelo e porque é aqui que dá pra errar calado — sugerir "e aí, fechou?"
 * pra quem nunca recebeu proposta.
 */
import type { ProspectRow, RadarCompany } from "@/lib/prospectTypes";

export const SITUATIONS = [
  "apresentar",
  "marcar_conversa",
  "mandar_proposta",
  "saber_decisao",
  "voltar_depois",
  "recomecar",
] as const;
export type Situation = (typeof SITUATIONS)[number];

export const SITUATION_LABELS: Record<Situation, string> = {
  apresentar: "Me apresentar",
  marcar_conversa: "Marcar uma conversa",
  mandar_proposta: "Mandar a proposta",
  saber_decisao: "Saber a decisão",
  voltar_depois: "Voltar depois",
  recomecar: "Recomeçar",
};

export interface MessageTemplate {
  id: string;
  name: string;
  situation: Situation;
  position: number;
  body: string;
}

export function normalizeSituation(value: unknown): Situation {
  return SITUATIONS.includes(value as Situation)
    ? (value as Situation)
    : "apresentar";
}

/** Dias inteiros desde o último registro. `null` quando nunca houve contato:
 *  é diferente de zero, e o texto não pode dizer "faz 0 dias". */
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
 * O que se quer deste contato agora.
 *
 * A ordem das perguntas é a regra. Sessenta dias parados viram "recomeçar"
 * mesmo dentro do funil: cobrar decisão depois de dois meses é pedir pra não
 * receber resposta. Contato sem nenhum registro é apresentação, ainda que a
 * etapa diga outra coisa — a etapa pode ter sido arrastada à mão.
 */
export function suggestForProspect(
  prospect: Pick<ProspectRow, "stage" | "touch_count">,
  dias: number | null
): Situation {
  if (prospect.touch_count === 0) return "apresentar";
  if (prospect.stage.kind === "nutricao") return "voltar_depois";
  if (dias !== null && dias >= 60) return "recomecar";

  const etapa = prospect.stage.name.toLowerCase();
  if (etapa.includes("proposta") || etapa.includes("negocia"))
    return "saber_decisao";
  if (etapa.includes("conversa") || etapa.includes("diagn"))
    return "mandar_proposta";
  return "marcar_conversa";
}

/** Empresa do Radar nunca recebeu mensagem: é sempre apresentação. O que
 *  muda entre os modelos é a primeira linha — indicação, perfil parado —, e
 *  isso quem escolhe é quem está olhando o perfil. */
export function suggestForCompany(): Situation {
  return "apresentar";
}

export type MessageVars = Record<string, string>;

export function prospectVars(
  prospect: ProspectRow,
  dias: number | null
): MessageVars {
  return {
    nome: prospect.contact_name.trim() || prospect.name,
    pessoa: prospect.contact_name.trim() || prospect.name,
    empresa: prospect.name,
    dias: dias === null ? "" : String(dias),
    combinado: prospect.next_contact_what,
    valor: prospect.value > 0 ? BRL.format(prospect.value) : "",
    ramo: "",
    indicacao: prospect.origin.trim(),
    perfil: prospect.handle.trim(),
  };
}

export function companyVars(company: RadarCompany): MessageVars {
  const pessoa = company.comms_name.trim() || company.contact.trim();
  return {
    nome: pessoa,
    pessoa,
    empresa: company.company,
    dias: "",
    combinado: "",
    valor: "",
    ramo: company.sector.trim().toLowerCase(),
    indicacao: company.referral.trim(),
    perfil: company.instagram.trim(),
  };
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Preenche o modelo.
 *
 * Variável sem valor leva a linha inteira embora, e não deixa um buraco no
 * meio da frase: "Fiquei de ." é pior do que um parágrafo a menos, e esta é a
 * mensagem que vai pro cliente sem passar por revisão.
 */
export function renderMessage(body: string, vars: MessageVars): string {
  return body
    .split("\n")
    .filter((linha) => {
      const usadas = [...linha.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      return usadas.every((chave) => vars[chave]?.trim());
    })
    .join("\n")
    .replace(/\{\{(\w+)\}\}/g, (original, chave: string) => {
      const valor = vars[chave];
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

/**
 * Qual dos modelos da situação abrir.
 *
 * Vence o que perde menos linhas com os dados que existem. É o que separa
 * "Indicação" de "Frio — só o ramo": os dois são apresentação, mas o
 * primeiro tem uma linha inteira sobre quem indicou, e sem indicação ela
 * some — o modelo abre mostrando menos do que ele é.
 *
 * Contar quantas linhas caem, em vez de exigir que nenhuma caia, é o que faz
 * a conta valer no caso comum: no Radar quase nunca há nome da pessoa, e aí
 * *todos* os modelos perdem o cumprimento. Com a régua do "inteiro ou nada",
 * empatariam todos em zero e a escolha voltaria a ser a ordem da lista.
 *
 * Em empate real fica o primeiro da ordem, que é a que se define nos Ajustes.
 */
export function pickTemplate(
  templates: MessageTemplate[],
  situation: Situation,
  vars: MessageVars
): MessageTemplate | null {
  const daSituacao = templates.filter((t) => t.situation === situation);
  const candidatos = daSituacao.length > 0 ? daSituacao : templates;
  if (candidatos.length === 0) return null;

  let melhor = candidatos[0];
  let menorPerda = linhasPerdidas(melhor, vars);

  for (const candidato of candidatos.slice(1)) {
    const perda = linhasPerdidas(candidato, vars);
    if (perda < menorPerda) {
      melhor = candidato;
      menorPerda = perda;
    }
  }
  return melhor;
}

function linhasPerdidas(template: MessageTemplate, vars: MessageVars): number {
  return (
    contaLinhas(template.body) - contaLinhas(renderMessage(template.body, vars))
  );
}

function contaLinhas(texto: string): number {
  return texto.split("\n").filter((linha) => linha.trim()).length;
}
