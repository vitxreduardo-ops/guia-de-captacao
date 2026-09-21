import { notFound } from "next/navigation";
import { BriefingForm } from "@/components/briefing/BriefingForm";
import { getBriefingLink, markBriefingLinkOpened } from "@/lib/briefingLinks";

export const dynamic = "force-dynamic";

/**
 * O briefing de um cliente específico.
 *
 * Chega com o que a gente já anotou no funil já respondido — o cliente entra
 * no meio do caminho em vez de digitar de novo o nome da própria empresa.
 */
export default async function InvitedBriefingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const link = await getBriefingLink(slug);

  if (!link) notFound();

  // Marca a abertura e segue: saber que o link chegou vale, mas não o
  // bastante pra segurar a tela se a escrita falhar.
  await markBriefingLinkOpened(link.id);

  const prefill: Record<string, string> = {};
  if (link.client_name) prefill.nome = link.client_name;
  if (link.contact) prefill.contato = link.contact;
  if (link.servico) prefill.servico = link.servico;

  return <BriefingForm prefill={prefill} linkSlug={link.slug} note={link.note} />;
}
