"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import { chatJson, MODELO_ROTEIRO, MODELO_TRIAGEM } from "@/lib/roteiroAi";
import {
  prompt6Chapeus,
  promptAIDA,
  promptMidtrack,
  promptPAS,
  PROMPT_TRIAGEM,
} from "@/lib/roteiroPrompts";
import { getSchemaPorFramework, schemaTriagem } from "@/lib/roteiroSchemas";
import { insertRoteiro, updateRoteiro } from "@/lib/roteiros";
import {
  STATUS_ROTEIRO,
  type Framework,
  type RoteiroJson,
  type StatusRoteiro,
} from "@/lib/roteiroTypes";

type Comum = {
  tema: string;
  objetivo: string;
  duracaoSegundos: number;
  tom: string;
  nicho: string;
};

// Erros voltam como valor: exceção de server action chega mascarada no
// cliente em produção, e a mensagem da IA é o que explica o que deu errado.
type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

function mensagem(err: unknown) {
  return err instanceof Error ? err.message : "Erro desconhecido.";
}

export async function sugerirFrameworkAction(
  tema: string,
  objetivo: string
): Promise<Resultado<{ framework_sugerido: Framework; justificativa: string }>> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };
  if (!tema || !objetivo) {
    return { ok: false, error: "Tema e objetivo são obrigatórios." };
  }
  try {
    const data = await chatJson<{
      framework_sugerido: Framework;
      justificativa: string;
    }>({
      model: MODELO_TRIAGEM,
      system: PROMPT_TRIAGEM,
      user: `Tema: ${tema}\nObjetivo: ${objetivo}`,
      schema: schemaTriagem,
      temperature: 0.3,
    });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

export async function gerarRoteiroAction(input: {
  framework: Framework;
  comum: Comum;
  // Cada framework tem os próprios campos extras (CamposEspecificos).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra: any;
  tags: string[];
}): Promise<Resultado<{ roteiro: RoteiroJson; id: string | null }>> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };
  const { framework, comum, extra, tags } = input;

  let system: string;
  switch (framework) {
    case "AIDA":
      system = promptAIDA(comum, extra);
      break;
    case "PAS":
      system = promptPAS(comum, extra);
      break;
    case "Midtrack":
      system = promptMidtrack(comum, extra);
      break;
    case "6Chapeus":
      system = prompt6Chapeus(comum, extra);
      break;
    default:
      return { ok: false, error: `Framework desconhecido: ${framework}` };
  }

  let roteiro: RoteiroJson;
  try {
    roteiro = await chatJson<RoteiroJson>({
      model: MODELO_ROTEIRO,
      system,
      user: "Gere o roteiro seguindo rigorosamente o schema fornecido.",
      schema: getSchemaPorFramework(framework),
      temperature: 0.8,
    });
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }

  // Falha ao salvar não derruba a geração: o roteiro já custou a chamada e
  // continua na tela, só sem entrar no histórico dessa vez.
  let id: string | null = null;
  try {
    id = await insertRoteiro({
      framework,
      tema: comum.tema,
      objetivo: comum.objetivo,
      duracao_segundos: comum.duracaoSegundos,
      tom: comum.tom,
      nicho: comum.nicho,
      roteiro,
      tags: limparTags(tags),
    });
    revalidatePath("/admin/roteiros/historico");
  } catch (err) {
    console.error(err);
  }

  return { ok: true, data: { roteiro, id } };
}

function limparTags(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags.filter((t): t is string => typeof t === "string" && t.trim() !== "")
    : [];
}

export async function atualizarRoteiroAction(
  id: string,
  mudanca: { favorito?: boolean; status?: string; tags?: string[] }
): Promise<Resultado<null>> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };

  const updates: { favorito?: boolean; status?: StatusRoteiro; tags?: string[] } = {};
  if (typeof mudanca.favorito === "boolean") updates.favorito = mudanca.favorito;
  if (mudanca.status !== undefined) {
    if (!STATUS_ROTEIRO.includes(mudanca.status as StatusRoteiro)) {
      return { ok: false, error: "Status inválido." };
    }
    updates.status = mudanca.status as StatusRoteiro;
  }
  if (mudanca.tags !== undefined) updates.tags = limparTags(mudanca.tags);
  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Nenhum campo válido para atualizar." };
  }

  try {
    await updateRoteiro(id, updates);
    revalidatePath("/admin/roteiros/historico");
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}
