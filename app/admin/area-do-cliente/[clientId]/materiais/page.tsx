import { notFound } from "next/navigation";
import { MaterialsManager } from "@/components/admin/MaterialsManager";
import { listEntregasColumnsWithCounts } from "@/lib/backlog";
import { listClientMaterials } from "@/lib/clientArea";
import { getGalleryClientWithImages, toPickerImages } from "@/lib/galleries";
import { listPublishedGuidesByClientName } from "@/lib/guides";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MateriaisAdminPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getGalleryClientWithImages(clientId);
  if (!client) notFound();

  const [materials, columns, guides] = await Promise.all([
    listClientMaterials(clientId),
    listEntregasColumnsWithCounts(),
    // id do guia: a consulta pública devolve só slug, então buscamos o id aqui
    (async () => {
      const published = await listPublishedGuidesByClientName(client.name);
      if (!published.length) return [];
      const { data } = await getSupabaseServerClient()
        .from("guides")
        .select("id, slug, title")
        .in("slug", published.map((g) => g.slug));
      return (data ?? []) as { id: string; slug: string; title: string }[];
    })(),
  ]);

  return (
    <MaterialsManager
      clientId={clientId}
      columns={columns.map((c) => ({ id: c.id, name: c.name, visible: c.clientVisible }))}
      guides={guides.map((g) => ({ id: g.id, title: g.title }))}
      images={toPickerImages(client.images)}
      rows={materials.map((m) => ({
        id: m.id,
        title: m.title,
        format: m.format,
        post_date: m.post_date,
        caption: m.caption,
        drive_url: m.drive_url,
        guide_id: m.guide_id,
        media_image_ids: m.media_image_ids,
        column_id: m.column_id,
        column_name: m.column_name,
        column_visible: m.column_visible,
        status: m.approved_at ? "approved" : m.changes_requested_at ? "changes" : "waiting",
      }))}
    />
  );
}
