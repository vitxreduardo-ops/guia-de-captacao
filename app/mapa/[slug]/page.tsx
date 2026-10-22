import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMindMapBySlug } from "@/lib/mindMaps";
import { MindMapView } from "@/components/mindmap/MindMapView";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const map = await getMindMapBySlug((await params).slug);
  return { title: map?.status === "published" ? `${map.title} · Tatú Estúdio` : "Tatú Estúdio" };
}

export default async function PublicMindMapPage({ params }: { params: Params }) {
  const map = await getMindMapBySlug((await params).slug);
  if (!map || map.status !== "published") notFound();

  return (
    <div className="h-svh" style={{ background: map.root.bg ?? "#ffffff" }}>
      <MindMapView initial={map.root} full />
    </div>
  );
}
