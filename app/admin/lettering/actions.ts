"use server";

import {
  excluirFonte,
  excluirLayout,
  guardarFonte,
  CATEGORIAS_FONTE,
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

/** Só as fontes: o seletor do estúdio carrega na abertura da tela. */
export async function carregarFontesAction(): Promise<FonteSalva[]> {
  return listarFontes();
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
  const peso = String(formData.get("peso") ?? "").trim();
  const categoriaBruta = String(formData.get("categoria") ?? "").trim();
  // A coluna tem check: categoria desconhecida vira vazio em vez de erro 500.
  const categoria = (CATEGORIAS_FONTE as readonly string[]).includes(
    categoriaBruta,
  )
    ? categoriaBruta
    : "";

  if (!(arquivo instanceof File) || !rotulo) return listarFontes();

  await guardarFonte(cliente, rotulo, arquivo, peso, categoria);
  return listarFontes();
}

export async function excluirFonteAction(id: string): Promise<FonteSalva[]> {
  await excluirFonte(id);
  return listarFontes();
}
