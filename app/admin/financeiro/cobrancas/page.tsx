import { redirect } from "next/navigation";

/** O endereço antigo continua valendo: leva à aba que ficou no lugar. */
export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  redirect(`/admin/financeiro/pagar-e-receber${mes ? `?mes=${encodeURIComponent(mes)}` : ""}`);
}
