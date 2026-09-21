/**
 * O corpo do contrato com as variáveis trocadas.
 *
 * Fora de `contracts.ts` porque é conta pura: não toca banco, não é
 * `server-only`, e é o único pedaço do contrato onde dá pra errar em silêncio
 * — daí o teste em `tests/contractBody.test.ts`.
 */

export type ContractVars = {
  client_name: string;
  client_document: string;
  scope: string;
  price: number;
  payment_terms: string;
  start_date: string | null;
  duration_months: number | null;
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** `2026-09-20` vira `20/09/2026` sem passar por `Date`, que joga o dia pra
 *  trás quando o fuso do servidor é negativo. */
function formatDate(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

export function contractValues(vars: ContractVars): Record<string, string> {
  return {
    cliente: vars.client_name,
    documento: vars.client_document,
    escopo: vars.scope,
    valor: vars.price > 0 ? BRL.format(vars.price) : "",
    pagamento: vars.payment_terms,
    inicio: vars.start_date ? formatDate(vars.start_date) : "",
    meses: vars.duration_months ? String(vars.duration_months) : "",
  };
}

/**
 * Troca `{{nome}}` pelo valor correspondente.
 *
 * Campo ainda não preenchido devolve a própria variável, visível no texto. É
 * de propósito: apagado, o buraco passa batido e o contrato vai pro cliente
 * dizendo "pagará o valor de ." — com `{{valor}}` na tela, não passa.
 */
export function renderContractBody(body: string, vars: ContractVars): string {
  const valores = contractValues(vars);
  return body.replace(/\{\{(\w+)\}\}/g, (original, chave: string) => {
    const valor = valores[chave];
    return valor ? valor : original;
  });
}

/** As variáveis citadas no corpo que ainda não têm valor. A tela usa pra
 *  avisar antes de publicar. */
export function missingContractVars(
  body: string,
  vars: ContractVars
): string[] {
  const valores = contractValues(vars);
  const usadas = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  return [...new Set(usadas)].filter((chave) => !valores[chave]);
}

/**
 * Os parágrafos do corpo, na ordem.
 *
 * O `<textarea>` manda as quebras como `\r\n`, e aí não existem dois `\n`
 * seguidos: sem normalizar, o contrato inteiro vira um bloco só, com os `##`
 * e os `**` à mostra na página do cliente.
 */
export function contractBlocks(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean);
}
