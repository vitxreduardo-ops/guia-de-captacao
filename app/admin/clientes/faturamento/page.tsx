import { redirect } from "next/navigation";

/** Endereço antigo: faturamento e resumo viraram a tela Dinheiro. */
export default function Page() {
  redirect("/admin/clientes/dinheiro");
}
