import { AdminHeader } from "@/components/admin/AdminHeader";
import { ColarRoteiro } from "@/components/admin/ColarRoteiro";
import { listGuides } from "@/lib/guides";

export const dynamic = "force-dynamic";

export default async function ColarRoteiroPage() {
  const guias = await listGuides();

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Colar roteiro pronto"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Roteiros", href: "/admin/roteiros" },
          { label: "Colar roteiro" },
        ]}
      />
      <ColarRoteiro
        guias={guias.map((g) => ({ id: g.id, titulo: g.title, cliente: g.client_name }))}
      />
    </div>
  );
}
