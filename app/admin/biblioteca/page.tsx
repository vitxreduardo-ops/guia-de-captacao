import { listLibraryLinks } from "@/lib/library";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { LibraryBrowser } from "@/components/admin/LibraryBrowser";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const [links] = await Promise.all([
    listLibraryLinks(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl py-10">
      <AdminHeader
        title="Biblioteca"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Biblioteca" }]}
      />

      <LibraryBrowser links={links} />
    </div>
  );
}
