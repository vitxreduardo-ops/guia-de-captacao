import { AdminHeader } from "@/components/admin/AdminHeader";
import { ShortLinksManager } from "@/components/admin/ShortLinksManager";
import { listGalleryClients } from "@/lib/galleries";
import { listShortLinks } from "@/lib/shortLinks";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const [links, clientes] = await Promise.all([listShortLinks(), listGalleryClients()]);
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader title="Links curtos" trail={[{ label: "Admin", href: "/admin" }, { label: "Links curtos" }]} />
      <ShortLinksManager links={links} clientes={clientes.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
