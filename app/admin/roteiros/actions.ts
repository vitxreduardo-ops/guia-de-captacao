"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import {
  chatJson,
  chatConversaJson,
  MODELO_ROTEIRO,
  MODELO_TRIAGEM,
  type MensagemChat,
} from "@/lib/roteiroAi";
import {
  prompt6Chapeus,
  promptAIDA,
  promptMidtrack,
  promptPAS,
  promptChat,
  PROMPT_ORGANIZAR,
  PROMPT_TRIAGEM,
} from "@/lib/roteiroPrompts";
import {
  getSchemaPorFramework,
  schemaChat,
  schemaOrganizar,
  schemaTriagem,
} from "@/lib/roteiroSchemas";
import { addScene, addVideo, listGuides } from "@/lib/guides";
import { getRoteiro, insertRoteiro, updateRoteiro } from "@/lib/roteiros";
import { contextoDoCliente } from "@/lib/roteiroContexto";
import {
  DURACAO_MAX,
  DURACAO_MIN,
  STATUS_ROTEIRO,
  type Framework,
  type RoteiroJson,
  type RoteiroOrganizado,
  type StatusRoteiro,
  type VideoImportado,
  organizadoParaVideos,
  roteiroParaVideos,
  verificarIntocado,
} from "@/lib/roteiroTypes";

type Comum = {
  tema: string;
  objetivo: string;
  contexto: string;
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
  objetivo: string,
  contexto = ""
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
      user: `Tema: ${tema}\nObjetivo: ${objetivo}${
        contexto.trim() ? `\nContexto: ${contexto.trim()}` : ""
      }`,
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
  const { framework, extra, tags } = input;
  const comum = {
    ...input.comum,
    duracaoSegundos: Math.min(
      DURACAO_MAX,
      Math.max(DURACAO_MIN, Math.round(Number(input.comum.duracaoSegundos) || 60))
    ),
  };

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
      contexto: comum.contexto ?? "",
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

// Teto do que vai pra IA por chamada: a conversa inteira segue a cada
// mensagem, e sem corte uma conversa longa encarece cada resposta.
const MAX_MENSAGENS = 30;
const MAX_CARACTERES = 8000;

/**
 * O chat recebe, além da conversa, o cliente escolhido (roteiros dos guias
 * dele, lidos aqui no servidor) e o que está no gerador ao lado.
 */
export async function conversarAction(
  mensagens: MensagemChat[],
  contexto: { cliente?: string; formulario?: string } = {}
): Promise<Resultado<{ resposta: string; raciocinio: string[] }>> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };

  const validas = (Array.isArray(mensagens) ? mensagens : [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .slice(-MAX_MENSAGENS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));

  if (validas.at(-1)?.role !== "user") {
    return { ok: false, error: "Mensagem vazia." };
  }

  try {
    const cliente = typeof contexto.cliente === "string" ? contexto.cliente.trim().slice(0, 200) : "";
    const formulario =
      typeof contexto.formulario === "string" ? contexto.formulario.slice(0, MAX_CARACTERES) : "";
    const data = await chatConversaJson<{ resposta: string; raciocinio: string[] }>({
      model: MODELO_ROTEIRO,
      system: promptChat({
        cliente,
        roteirosDoCliente: cliente ? await contextoDoCliente(cliente) : "",
        formulario,
      }),
      mensagens: validas,
      schema: schemaChat,
      temperature: 0.8,
    });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

export async function listarGuiasAction(): Promise<
  Resultado<{ id: string; titulo: string; cliente: string }[]>
> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };
  try {
    const guias = await listGuides();
    return {
      ok: true,
      data: guias.map((g) => ({ id: g.id, titulo: g.title, cliente: g.client_name })),
    };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

// ponytail: vídeos e cenas entram um a um, sem transação; se cair no meio
// o vídeo fica pela metade no guia e dá pra apagar pelo editor.
async function inserirVideos(guiaId: string, videos: VideoImportado[]) {
  for (const video of videos) {
    const criado = await addVideo(guiaId, video.titulo, video.notas_producao);
    for (const cena of video.cenas) {
      await addScene(criado.id, { description: "", ...cena });
    }
  }
  revalidatePath(`/admin/guias/${guiaId}`);
}

/**
 * Manda um roteiro do histórico pra um guia: vira vídeo(s) novo(s) no fim do
 * guia, uma cena por bloco. Lê o roteiro do banco pelo id em vez de confiar
 * no que o navegador mandar.
 */
export async function enviarParaGuiaAction(
  roteiroId: string,
  guiaId: string
): Promise<Resultado<{ videos: number }>> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };
  try {
    const roteiro = await getRoteiro(roteiroId);
    if (!roteiro) return { ok: false, error: "Roteiro não encontrado." };

    const videos = roteiroParaVideos(roteiro.framework, roteiro.tema, roteiro.roteiro);
    await inserirVideos(guiaId, videos);
    return { ok: true, data: { videos: videos.length } };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

const MAX_ROTEIRO_COLADO = 20000;

/**
 * "Colar roteiro": a IA recorta o texto do cliente em vídeos e cenas sem
 * mudar palavra. Só devolve a prévia, com o resultado da checagem; nada é
 * gravado até a pessoa confirmar.
 */
export async function organizarRoteiroAction(texto: string): Promise<
  Resultado<{ videos: VideoImportado[]; alterados: string[]; deFora: string[] }>
> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };
  const original = typeof texto === "string" ? texto.trim() : "";
  if (!original) return { ok: false, error: "Cole o roteiro antes de organizar." };
  if (original.length > MAX_ROTEIRO_COLADO) {
    return { ok: false, error: "Roteiro longo demais: separe em partes de até 20 mil caracteres." };
  }
  try {
    const organizado = await chatJson<RoteiroOrganizado>({
      model: MODELO_ROTEIRO,
      system: PROMPT_ORGANIZAR,
      user: original,
      schema: schemaOrganizar,
      temperature: 0,
    });
    const videos = organizadoParaVideos(organizado).filter((v) => v.cenas.length > 0);
    if (videos.length === 0) {
      return { ok: false, error: "A IA não encontrou cenas nesse texto." };
    }
    return { ok: true, data: { videos, ...verificarIntocado(original, organizado) } };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}

const textos = (v: unknown) =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === "string" && t.trim() !== "") : [];
const texto = (v: unknown) => (typeof v === "string" ? v : "");

/** Grava no guia a prévia confirmada. Os vídeos vêm do navegador: só passa o formato esperado. */
export async function salvarVideosNoGuiaAction(
  guiaId: string,
  videos: VideoImportado[]
): Promise<Resultado<{ videos: number }>> {
  if (!(await getCurrentSession())) return { ok: false, error: "Sessão expirada." };
  if (typeof guiaId !== "string" || !guiaId) return { ok: false, error: "Guia inválido." };

  const limpos: VideoImportado[] = (Array.isArray(videos) ? videos : [])
    .slice(0, 20)
    .map((v) => ({
      titulo: texto(v?.titulo).trim() || "Sem título",
      notas_producao: texto(v?.notas_producao),
      cenas: (Array.isArray(v?.cenas) ? v.cenas : []).slice(0, 60).map((c) => ({
        script: texto(c?.script),
        description: texto(c?.description),
        hooks_alternativos: textos(c?.hooks_alternativos),
        ctas_alternativos: textos(c?.ctas_alternativos),
      })),
    }))
    .filter((v) => v.cenas.length > 0);
  if (limpos.length === 0) return { ok: false, error: "Nada para adicionar." };

  try {
    await inserirVideos(guiaId, limpos);
    return { ok: true, data: { videos: limpos.length } };
  } catch (err) {
    return { ok: false, error: mensagem(err) };
  }
}
