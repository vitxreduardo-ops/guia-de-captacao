"use server";

import { getPlanejamentoBySlug, setMarcacao } from "@/lib/planejamentos";
import { passosDa, type PassoId } from "@/lib/planejamentoTypes";

/**
 * O cliente marca ou desmarca um passo de uma entrega. A página é pública
 * (quem tem o link marca), então tudo é conferido aqui: planejamento
 * publicado, entrega existente e passo que essa entrega tem.
 */
export async function marcarPassoAction(
  slug: string,
  entregaId: string,
  passo: PassoId,
  feito: boolean,
): Promise<{ ok: boolean }> {
  const p = await getPlanejamentoBySlug(slug);
  if (!p || p.status !== "published") return { ok: false };
  const entrega = p.content.entregas.find((e) => e.id === entregaId);
  if (!entrega || !passosDa(entrega).some((x) => x.id === passo)) return { ok: false };

  // Sem revalidatePath: ele fazia o Next recarregar a página e perder o #
  // da entrega aberta. O admin é force-dynamic e já lê o banco a cada visita.
  await setMarcacao(p.id, entregaId, passo, feito === true);
  return { ok: true };
}
