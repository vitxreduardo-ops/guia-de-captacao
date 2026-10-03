import { redirect } from "next/navigation";

/** A seção abre no calendário editorial, o que mais se usa no dia a dia. */
export default function AreaDoClientePage() {
  redirect("/admin/area-do-cliente/calendario");
}
