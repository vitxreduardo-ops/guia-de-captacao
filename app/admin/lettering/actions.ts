"use server";

import {
  excluirFonte,
  excluirLayout,
  guardarFonte,
  listarFontes,
  listarLayouts,
  regravarLayout,
  salvarLayout,
  type FonteSalva,
  type LayoutSalvo,
} from "@/lib/letteringLibrary";

export async function carregarBiblioteca(): Promise<{
  layouts: LayoutSalvo[];
  fontes: FonteSalva[];
}> {
  const [layouts, fontes] = await Promise.all([listarLayouts(), listarFontes()]);
  return { layouts, fontes };
}

export async function guardarLayoutAction(
  nome: string,
  dados: unknown,
  idExistente?: string,
): Promise<LayoutSalvo[]> {
  const limpo = nome.trim();
  if (!limpo) return listarLayouts();

  if (idExistente) await regravarLayout(idExistente, dados);
  else await salvarLayout(limpo, dados);

  return listarLayouts();
}

export async function excluirLayoutAction(id: string): Promise<LayoutSalvo[]> {
  await excluirLayout(id);
  return listarLayouts();
}

export async function guardarFonteAction(
  formData: FormData,
): Promise<FonteSalva[]> {
  const arquivo = formData.get("arquivo");
  const cliente = String(formData.get("cliente") ?? "").trim();
  const rotulo = String(formData.get("rotulo") ?? "").trim();

  if (!(arquivo instanceof File) || !rotulo) return listarFontes();

  await guardarFonte(cliente, rotulo, arquivo);
  return listarFontes();
}

export async function excluirFonteAction(id: string): Promise<FonteSalva[]> {
  await excluirFonte(id);
  return listarFontes();
}
