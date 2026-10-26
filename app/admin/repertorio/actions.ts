"use server";

import { revalidatePath } from "next/cache";
import {
  coletarFonte,
  coletarFontes,
  createFonte,
  deleteFonte,
  getFonte,
  marcarNoticia,
  updateFonte,
} from "@/lib/repertorio";
import type { ResultadoColeta } from "@/lib/repertorioTypes";
import { feedPermitido } from "@/lib/rss";
import { requireTeam } from "@/lib/session";

// Erros voltam como valor: exceção de server action chega mascarada no
// cliente em produção, e a mensagem é o que explica o que deu errado.
type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

const mensagem = (err: unknown) => (err instanceof Error ? err.message : "Erro desconhecido.");

function revalidar() {
  revalidatePath("/admin/repertorio");
  revalidatePath("/admin/repertorio/fontes");
}

export async function atualizarAgoraAction(): Promise<Resultado<ResultadoColeta>> {
  await requireTeam("repertorio");
  try {
    const resultado = await coletarFontes();
    revalidar();
    return { ok: true, data: resultado };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

/**
 * Guardar e lida mudam na tela na hora (estado otimista no item); sem
 * revalidar, a notícia não some da lista "Não lidas" no meio da leitura.
 */
export async function marcarNoticiaAction(
  id: string,
  mudanca: { guardada?: boolean; lida?: boolean }
): Promise<Resultado<null>> {
  await requireTeam("repertorio");
  const limpa: { guardada?: boolean; lida?: boolean } = {};
  if (typeof mudanca?.guardada === "boolean") limpa.guardada = mudanca.guardada;
  if (typeof mudanca?.lida === "boolean") limpa.lida = mudanca.lida;
  if (typeof id !== "string" || !id || Object.keys(limpa).length === 0) {
    return { ok: false, error: "Nada para atualizar." };
  }
  try {
    await marcarNoticia(id, limpa);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "").trim();

/**
 * Salva e já coleta a fonte nova: a resposta diz na hora se o endereço é
 * mesmo um feed, sem esperar o cron do dia seguinte. Feed que falha fica
 * salvo com o erro à vista, pra pessoa decidir se apaga ou tenta de novo.
 */
export async function criarFonteAction(
  formData: FormData
): Promise<Resultado<{ novas: number; erro: string | null }>> {
  await requireTeam("repertorio");
  const nome = texto(formData, "nome").slice(0, 120);
  const feedUrl = texto(formData, "feed_url");
  const tema = texto(formData, "tema").slice(0, 60) || "Marketing";
  if (!nome) return { ok: false, error: "Dê um nome para a fonte." };
  if (!feedPermitido(feedUrl)) {
    return { ok: false, error: "Cole o endereço completo do feed, começando com https://." };
  }
  try {
    const fonte = await createFonte({ nome, feedUrl, tema });
    let novas = 0;
    let erro: string | null = null;
    try {
      novas = await coletarFonte(fonte);
    } catch (err) {
      erro = mensagem(err);
    }
    revalidar();
    return { ok: true, data: { novas, erro } };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

export async function atualizarFonteAction(formData: FormData): Promise<Resultado<null>> {
  await requireTeam("repertorio");
  const id = texto(formData, "id");
  if (!id) return { ok: false, error: "Fonte inválida." };
  const nome = texto(formData, "nome").slice(0, 120);
  const tema = texto(formData, "tema").slice(0, 60);
  try {
    await updateFonte(id, {
      ...(nome ? { nome } : {}),
      ...(tema ? { tema } : {}),
      ativa: formData.get("ativa") === "on",
    });
    revalidar();
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

export async function coletarFonteAction(id: string): Promise<Resultado<{ novas: number }>> {
  await requireTeam("repertorio");
  if (typeof id !== "string" || !id) return { ok: false, error: "Fonte inválida." };
  try {
    const fonte = await getFonte(id);
    if (!fonte) return { ok: false, error: "Fonte não encontrada." };
    const novas = await coletarFonte(fonte);
    revalidar();
    return { ok: true, data: { novas } };
  } catch (err) {
    revalidar();
    return { ok: false, error: mensagem(err) };
  }
}

export async function apagarFonteAction(id: string): Promise<Resultado<null>> {
  await requireTeam("repertorio");
  if (typeof id !== "string" || !id) return { ok: false, error: "Fonte inválida." };
  try {
    await deleteFonte(id);
    revalidar();
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}
