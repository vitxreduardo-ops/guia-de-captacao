import { redirect } from "next/navigation";

/** Endereço antigo, de antes da seção Clientes existir. */
export default function FaturamentoRedirectPage() {
  redirect("/admin/clientes/faturamento");
}
