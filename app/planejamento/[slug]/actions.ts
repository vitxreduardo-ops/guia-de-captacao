"use server";

import { getCurrentSession } from "@/lib/session";
import { aplicarEdicao } from "@/lib/planejamentoEdit";
import { equipePodeEditar, getPlanejamentoBySlug, setMarcacao, updatePlanejamentoContent } from "@/lib/planejamentos";
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

export type RespostaEdicao = { ok: true; valor: string; anterior: string } | { ok: false; erro: string };

/**
 * A equipe edita um texto direto na página. A página é pública, então a sessão
 * é conferida a cada edição (não só na hora de mostrar o botão), o caminho
 * passa por uma lista fixa e o texto é validado em `aplicarEdicao`.
 * Sempre lê o conteúdo fresco do banco: duas pessoas editando campos
 * diferentes quase ao mesmo tempo não se atropelam; no mesmo campo, vale a última.
 */
export async function editarCampoAction(slug: string, caminho: string[], valor: string): Promise<RespostaEdicao> {
  if (!equipePodeEditar(await getCurrentSession())) return { ok: false, erro: "Entre como equipe para editar." };
  if (!Array.isArray(caminho) || caminho.length > 6 || !caminho.every((x) => typeof x === "string") || typeof valor !== "string") {
    return { ok: false, erro: "Pedido inválido." };
  }
  const p = await getPlanejamentoBySlug(slug);
  if (!p) return { ok: false, erro: "Planejamento não encontrado." };

  const r = aplicarEdicao(p.content, caminho, valor);
  if (!r.ok) return r;
  await updatePlanejamentoContent(p.id, r.content);
  return { ok: true, valor: r.valor, anterior: r.anterior };
}
