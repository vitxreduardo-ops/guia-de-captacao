import { AdminHeader } from "@/components/admin/AdminHeader";
import { SalvosInstagramBoard } from "@/components/admin/SalvosInstagramBoard";
import { getSavedStatus, listSavedInstagram } from "@/lib/salvosInstagram";

export const dynamic = "force-dynamic";

export default async function SalvosInstagramPage() {
  const [{ collections, posts }, status] = await Promise.all([listSavedInstagram(), getSavedStatus()]);

  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <AdminHeader
        title="Salvos do Instagram"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Referências", href: "/admin/referencias" },
          { label: "Salvos do Instagram" },
        ]}
      />
      <SalvosInstagramBoard collections={collections} posts={posts} status={status} />
    </div>
  );
}
