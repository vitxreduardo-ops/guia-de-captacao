import { listReferencePins } from "@/lib/referencePins";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ReferenceBoard } from "@/components/admin/ReferenceBoard";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const [pins, username] = await Promise.all([
    listReferencePins(),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Referências"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Referências" }]}
        username={username}
      />

      <ReferenceBoard pins={pins} />
    </div>
  );
}
