import { redirect } from "next/navigation";

/** Endereço antigo, de antes da seção Clientes existir. */
export default function EntregasRedirectPage() {
  redirect("/admin/clientes/entregas");
}
