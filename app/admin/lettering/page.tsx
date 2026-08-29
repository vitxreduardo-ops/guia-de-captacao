import { AdminHeader } from "@/components/admin/AdminHeader";
import { LetteringStudioClient } from "@/components/admin/LetteringStudioClient";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LetteringPage() {
  const username = await getCurrentUsername();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <AdminHeader
        title="Lettering"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Lettering" }]}
        username={username}
        dense
      />

      <LetteringStudioClient />
    </div>
  );
}
