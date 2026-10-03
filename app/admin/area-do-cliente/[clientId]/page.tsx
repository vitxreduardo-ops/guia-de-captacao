import { redirect } from "next/navigation";

/** O cliente abre no calendário editorial, o que mais se usa no dia a dia. */
export default async function ClientAreaClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  redirect(`/admin/area-do-cliente/${(await params).clientId}/calendario`);
}
