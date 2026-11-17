import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { equipePodeEditar, getPlanejamentoBySlug, listMarcacoes } from "@/lib/planejamentos";
import { semRascunhos } from "@/lib/planejamentoTypes";
import { PlanejamentoView } from "@/components/planejamento/PlanejamentoView";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPlanejamentoBySlug(slug);
  const title = p && p.status === "published" ? `${p.title} · ${p.client_name}` : "Planejamento · Tatú Estúdio";
  // Conteúdo de cliente: fora do Google.
  return { title, robots: { index: false, follow: false } };
}

export default async function PlanejamentoPublicoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = await getPlanejamentoBySlug(slug);
  if (!p) notFound();

  if (p.status !== "published") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--tatu-cream)] px-4 text-center">
        <p className="text-lg text-[var(--tatu-ink)]/70">Este planejamento ainda não foi publicado.</p>
      </div>
    );
  }

  const marcadas = (await listMarcacoes([p.id])).get(p.id) ?? [];
  // A equipe vê o botão de editar; o cliente nunca. Quem grava confere a sessão de novo.
  const podeEditar = equipePodeEditar(await getCurrentSession());
  // A equipe vê exatamente o que o cliente vê (rascunhos da IA seguem escondidos; esses se revisam no painel).
  return <PlanejamentoView slug={p.slug} clientName={p.client_name ?? ""} content={semRascunhos(p.content)} marcadas={marcadas} podeEditar={podeEditar} />;
}
