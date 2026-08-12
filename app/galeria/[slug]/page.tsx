import { notFound } from "next/navigation";
import {
  buildGalleryFolderTree,
  getGalleryClientBySlugWithImages,
} from "@/lib/galleries";
import { TatuLogo } from "@/components/TatuLogo";
import { GalleryFolderBrowser } from "@/components/GalleryFolderBrowser";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export default async function PublicGalleryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const client = await getGalleryClientBySlugWithImages(slug);

  if (!client) notFound();

  if (client.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-sm text-neutral-500">
          Esta galeria ainda não foi publicada.
        </p>
      </div>
    );
  }

  const root = buildGalleryFolderTree(client.images);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-10 border-b border-neutral-200 pb-6 text-center">
          <TatuLogo className="mx-auto mb-8 block h-9 w-auto text-black" />
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Galeria
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {client.name}
          </h1>
        </header>

        {client.images.length === 0 ? (
          <p className="text-center text-sm text-neutral-500">
            Nenhuma foto adicionada ainda.
          </p>
        ) : (
          <GalleryFolderBrowser root={root} />
        )}
      </div>
    </div>
  );
}
