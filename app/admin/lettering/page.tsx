import { AdminHeader } from "@/components/admin/AdminHeader";
import { LetteringStudioClient } from "@/components/admin/LetteringStudioClient";

export const dynamic = "force-dynamic";

export default async function LetteringPage() {

  return (
    <div className="mx-auto w-full max-w-6xl pb-4 sm:pb-8">
      <AdminHeader
        title="Lettering"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Lettering" }]}
        dense
      />

      <LetteringStudioClient />
    </div>
  );
}
