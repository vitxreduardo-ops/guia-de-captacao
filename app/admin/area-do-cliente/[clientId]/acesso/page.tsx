import { notFound } from "next/navigation";
import { ClientLoginsManager } from "@/components/admin/ClientLoginsManager";
import { getGalleryClientWithImages } from "@/lib/galleries";
import { listPendingClientInvites } from "@/lib/invites";
import { listClientUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AcessoPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const [client, logins, invites] = await Promise.all([
    getGalleryClientWithImages(clientId),
    listClientUsers(clientId),
    listPendingClientInvites(clientId),
  ]);
  if (!client) notFound();

  return (
    <ClientLoginsManager
      clientId={clientId}
      clientName={client.name}
      article={client.gallery_article}
      logins={logins.map((u) => ({
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        portal_label: u.portal_label,
      }))}
      invites={invites.map((i) => ({
        id: i.id,
        token: i.token,
        label: i.label,
        created_at: i.created_at,
      }))}
    />
  );
}
