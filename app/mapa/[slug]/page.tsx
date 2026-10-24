import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
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
  if (!map) notFound();

  const published = map.status === "published";
  // Rascunho: a equipe (logada) vê o mapa como prévia; quem abre o link sem
  // login recebe um aviso em vez de uma página de erro.
  const session = published ? null : await getCurrentSession();
  const isTeam = Boolean(session && session.role !== "client");

  if (!published && !isTeam) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--tatu-beige)] px-4 text-center">
        <p className="text-sm text-[var(--tatu-ink)]/70">Este mapa ainda não foi publicado.</p>
      </div>
    );
  }

  return (
    <div className="relative h-svh" style={{ background: map.root.bg ?? "#ffffff" }}>
      {!published && (
        <p className="absolute top-3 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#838059]/25 bg-[#e4e6d6] px-3 py-1 text-xs text-[#2f3b1e] shadow-sm">
          Rascunho: só a equipe vê esta prévia
        </p>
      )}
      <MindMapView initial={map.root} full />
    </div>
  );
}
