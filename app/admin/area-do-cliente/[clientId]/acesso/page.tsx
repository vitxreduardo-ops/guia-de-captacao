import { notFound } from "next/navigation";
import { ClientAccessSection } from "@/components/admin/ClientAccessSection";
import { getGalleryClientWithImages } from "@/lib/galleries";
import { getClientUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AcessoPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const [client, login] = await Promise.all([
    getGalleryClientWithImages(clientId),
    getClientUser(clientId),
  ]);
  if (!client) notFound();

  return (
    <ClientAccessSection
      clientId={clientId}
      name={client.name}
      login={login?.username ?? null}
      article={client.gallery_article}
    />
  );
}
