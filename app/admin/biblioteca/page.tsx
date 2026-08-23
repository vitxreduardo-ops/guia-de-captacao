import { listLibraryLinks } from "@/lib/library";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { LibraryBrowser } from "@/components/admin/LibraryBrowser";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const [links, username] = await Promise.all([
    listLibraryLinks(),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Biblioteca"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Biblioteca" }]}
        username={username}
      />

      <LibraryBrowser links={links} />
    </div>
  );
}
