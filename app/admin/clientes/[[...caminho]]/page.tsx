import { redirect } from "next/navigation";
import { FINANCEIRO_POR_ABA } from "@/lib/secoesTabs";

/**
 * Endereços de antes da seção Clientes virar Entregas e Financeiro. Segue
 * existindo porque notificações já gravadas, o bot do Telegram e favoritos
 * ainda apontam para cá. O proxy deixa `/admin/clientes` passar para todos
 * (ver proxy.ts); a permissão de verdade é checada no endereço novo.
 */
export default async function ClientesAntigoPage({
  params,
  searchParams,
}: {
  params: Promise<{ caminho?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { caminho = [] } = await params;
  const busca = await searchParams;
  const um = (chave: string) => (typeof busca[chave] === "string" ? (busca[chave] as string) : undefined);
  const com = (destino: string, ...chaves: string[]) => {
    const q = new URLSearchParams();
    for (const chave of chaves) {
      const v = um(chave);
      if (v) q.set(chave, v);
    }
    const texto = q.toString();
    return texto ? `${destino}?${texto}` : destino;
  };

  const [pagina, sub] = caminho;
  if (pagina === "entregas") redirect(sub === "calendario" ? "/admin/entregas/calendario" : "/admin/entregas");
  if (pagina === "dinheiro") redirect(com(FINANCEIRO_POR_ABA[um("aba") ?? "hoje"] ?? FINANCEIRO_POR_ABA.hoje, "mes", "base"));
  if (pagina === "faturamento" || pagina === "resumo") redirect(FINANCEIRO_POR_ABA.hoje);
  if (pagina === "cadastro") redirect(com("/admin/financeiro/clientes", "abrir"));
  if (pagina === "protocolo") redirect(com("/admin/financeiro/os", "q"));
  redirect("/admin/entregas");
}
