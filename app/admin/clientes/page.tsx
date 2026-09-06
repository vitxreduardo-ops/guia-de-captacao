import { redirect } from "next/navigation";

/** A seção abre nas entregas, que é a tela do dia a dia. */
export default function ClientesPage() {
  redirect("/admin/clientes/entregas");
}
