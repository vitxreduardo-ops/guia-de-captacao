import { listReferencePins } from "@/lib/referencePins";
import { getSavedStatus } from "@/lib/salvosInstagram";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ReferenceBoard } from "@/components/admin/ReferenceBoard";

export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const [pins, salvos] = await Promise.all([
    listReferencePins(),
    getSavedStatus(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <AdminHeader
        title="Referências"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Referências" }]}
      />

      <ReferenceBoard pins={pins} salvosAlert={salvos.state === "login"} />
    </div>
  );
}
