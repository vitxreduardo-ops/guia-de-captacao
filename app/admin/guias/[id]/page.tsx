import { notFound } from "next/navigation";
import { getGuideWithSections, listGuideClientNames } from "@/lib/guides";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { GeneralInfoForm } from "@/components/admin/GeneralInfoForm";
import { PublishBox } from "@/components/admin/PublishBox";
import { VideosSection } from "@/components/admin/VideosSection";
import { MediaGridSection } from "@/components/admin/MediaGridSection";
import { ShotListSection } from "@/components/admin/ShotListSection";
import { ChecklistSection } from "@/components/admin/ChecklistSection";
import {
  addCardItemAction,
  addPhotoItemAction,
  addVideoReferenceItemAction,
  deleteCardItemAction,
  deletePhotoItemAction,
  deleteVideoReferenceItemAction,
  toggleCardItemSelectedAction,
  togglePhotoItemSelectedAction,
  toggleVideoReferenceItemSelectedAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function GuideEditPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const [guide, clientes] = await Promise.all([
    getGuideWithSections(id),
    listGuideClientNames(),
  ]);

  if (!guide) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <AdminHeader
        title={guide.title}
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Guias", href: "/admin/guias" },
        ]}
      />

      <div className="space-y-8">
        <PublishBox guide={guide} />
        <GeneralInfoForm guide={guide} clientes={clientes} />
        <VideosSection
          guideId={guide.id}
          guideSlug={guide.slug}
          videos={guide.videos}
          references={guide.visual_references}
        />
        <MediaGridSection
          title="Referências de vídeo"
          emptyLabel="Nenhuma referência de vídeo adicionada ainda."
          linkPlaceholder="Ou link (Instagram, YouTube, Vimeo...)"
          guideId={guide.id}
          items={guide.video_reference_items}
          addAction={addVideoReferenceItemAction}
          deleteAction={deleteVideoReferenceItemAction}
          toggleSelectedAction={toggleVideoReferenceItemSelectedAction.bind(
            null,
            guide.id
          )}
        />
        <MediaGridSection
          title="Fotos"
          emptyLabel="Nenhuma foto adicionada ainda."
          guideId={guide.id}
          items={guide.photo_items}
          addAction={addPhotoItemAction}
          deleteAction={deletePhotoItemAction}
          toggleSelectedAction={togglePhotoItemSelectedAction.bind(
            null,
            guide.id
          )}
        />
        <MediaGridSection
          title="Cards"
          emptyLabel="Nenhum card adicionado ainda."
          guideId={guide.id}
          items={guide.card_items}
          addAction={addCardItemAction}
          deleteAction={deleteCardItemAction}
          toggleSelectedAction={toggleCardItemSelectedAction.bind(
            null,
            guide.id
          )}
        />
        <ShotListSection guideId={guide.id} items={guide.shot_list_items} />
        <ChecklistSection guideId={guide.id} items={guide.checklist_items} />
      </div>
    </div>
  );
}
