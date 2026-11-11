import "server-only";
import { listBudgets, type Budget } from "@/lib/budgets";
import { listContracts, type Contract } from "@/lib/contracts";
import { sameName } from "@/lib/clientLogoMatch";

/**
 * Contratos e orçamentos não guardam o id do cliente, só o nome digitado. A
 * ligação é pelo nome (ou pela razão social), ignorando caixa e acento — se o
 * nome foi escrito diferente, o documento não aparece aqui, e a página avisa.
 */
export async function getClientDocs(client: {
  name: string;
  company_name: string | null;
}): Promise<{ contracts: Contract[]; budgets: Budget[] }> {
  const [contracts, budgets] = await Promise.all([listContracts(), listBudgets()]);
  const match = (name: string) =>
    sameName(name, client.name) ||
    (client.company_name ? sameName(name, client.company_name) : false);
  return {
    contracts: contracts.filter((c) => match(c.client_name)),
    budgets: budgets.filter((b) => match(b.client_name)),
  };
}
