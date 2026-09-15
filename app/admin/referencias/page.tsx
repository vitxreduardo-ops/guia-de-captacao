import { listReferencePins } from "@/lib/referencePins";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ReferenceBoard } from "@/components/admin/ReferenceBoard";

export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const [pins] = await Promise.all([
    listReferencePins(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl py-10">
      <AdminHeader
        title="Referências"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Referências" }]}
      />

      <ReferenceBoard pins={pins} />
    </div>
  );
}
