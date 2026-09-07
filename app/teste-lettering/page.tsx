import { AdminHeader } from "@/components/admin/AdminHeader";
import { LetteringStudioClient } from "@/components/admin/LetteringStudioClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <AdminHeader title="Lettering" dense />
      <LetteringStudioClient />
    </div>
  );
}
