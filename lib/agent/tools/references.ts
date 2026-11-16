import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createReferencePin, listReferenceTags } from "@/lib/referencePins";
import { createLibraryLink, listLibraryTags } from "@/lib/library";
import { resolveReferencePin } from "@/lib/references";
import { fetchLinkMeta } from "@/lib/linkMeta";
import { canonicalizeTags } from "@/lib/tags";
import { normalizeName } from "@/lib/agent/match";
import { PermissionError, canSeeClient, canUseSection, clientScope } from "@/lib/agent/permissions";
import { ToolInputError, optInt, optString, reqString } from "@/lib/agent/validate";
import { firstUrl, urlKey } from "@/lib/agent/url";
import { resolveClient } from "@/lib/agent/tools/tasks";
import type { ReadTool, ToolSchema, WriteTool } from "@/lib/agent/types";
import type { TelegramActor } from "@/lib/telegram/identity";

function assertSection(actor: TelegramActor, section: "referencias" | "biblioteca") {
  if (!canUseSection(actor, section)) {
    throw new PermissionError(`Você não tem acesso a ${section === "referencias" ? "Referências" : "Biblioteca"}.`);
  }
}

/** Até 6 etiquetas curtas, casadas com as que já existem (sem duplicar "referência"/"referencias"). */
function cleanTags(raw: unknown, known: string[]): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ToolInputError('"tags" precisa ser uma lista de textos.');
  const tags = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 6);
  return canonicalizeTags(tags, known);
}

const tagsProperty = {
  type: ["array", "null"],
  items: { type: "string" },
  description: "Até 6 etiquetas curtas: nicho, formato, tema. Ex.: [\"campanha institucional\", \"reels\"].",
};

const looseSchema = (properties: Record<string, unknown>): ToolSchema => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

// ----------------------------------------------------------- referências

type SaveReferenceParams = {
  url: string;
  title: string;
  note: string;
  client: string;
  client_id: string | null;
  tags: string[];
  kind: "image" | "video" | "link";
  thumb_url: string;
};

export const saveReference: WriteTool<SaveReferenceParams> = {
  kind: "write",
  name: "save_reference",
  topic: "referencias",
  description:
    "Salva um link como referência criativa (mural de Referências): post do Instagram, Pinterest, YouTube ou site. " +
    "Pede confirmação. Use quando a pessoa mandar um link para guardar como referência/inspiração. " +
    "Link de ferramenta ou site útil à equipe (não é inspiração de conteúdo) vai em save_library_link.",
  parameters: looseSchema({
    url: { type: "string", description: "O link, com https://." },
    client: { type: ["string", "null"], description: "Cliente a quem a referência serve; vazio = referência geral." },
    title: { type: ["string", "null"], description: "Título curto; vazio = o da própria página." },
    note: { type: ["string", "null"], description: "Por que guardar: tema, o que chamou atenção." },
    tags: tagsProperty,
  }),

  async prepare(actor, args) {
    assertSection(actor, "referencias");
    const rawUrl = reqString(args, "url", 2000);
    const url = firstUrl(rawUrl) ?? rawUrl;
    const key = urlKey(url);
    if (!key) throw new ToolInputError("Esse link não parece válido (precisa começar com http).");

    // Evita duplicidade: compara o link sem rastreio, www, barra final.
    const { data: existing, error } = await getSupabaseServerClient().from("reference_pins").select("id, title, url, client");
    if (error) throw error;
    const dup = (existing ?? []).find((r) => urlKey(String(r.url)) === key);
    if (dup) {
      throw new ToolInputError(
        `Esse link já está nas Referências${dup.title ? ` (${dup.title})` : ""}${dup.client ? `, de ${dup.client}` : ""}. Não salvei de novo.`
      );
    }

    const clientQuery = optString(args, "client", 100);
    const client = clientQuery ? await resolveClient(actor, clientQuery) : null;

    const [resolved, meta, knownTags] = await Promise.all([
      resolveReferencePin(url),
      fetchLinkMeta(url),
      listReferenceTags(),
    ]);
    const title = optString(args, "title", 200) ?? meta?.title ?? "";
    const note = optString(args, "note", 1000) ?? "";
    const tags = cleanTags(args.tags, knownTags);

    const summary = [
      "Salvar referência",
      `Link: ${url}`,
      `Título: ${title || "(sem título — vai pelo endereço do site)"}`,
      `Cliente: ${client?.name ?? "geral (sem cliente)"}`,
      `Tipo: ${{ image: "imagem", video: "vídeo", link: "link" }[resolved.kind]}`,
      `Capa: ${resolved.thumb_url ? "encontrada" : "não encontrada"}`,
      tags.length ? `Tags: ${tags.join(", ")}` : null,
      note ? `Nota: ${note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      summary,
      params: {
        url,
        title,
        note,
        client: client?.name ?? "",
        client_id: client?.id ?? null,
        tags,
        kind: resolved.kind,
        thumb_url: resolved.thumb_url,
      },
    };
  },

  async execute(actor, p) {
    assertSection(actor, "referencias");
    if (p.client_id && !canSeeClient(actor, p.client_id)) throw new PermissionError("Esse cliente está fora do seu acesso.");
    // Entre a prévia e o clique alguém pode ter salvo o mesmo link.
    const key = urlKey(p.url);
    const { data: existing } = await getSupabaseServerClient().from("reference_pins").select("url");
    if ((existing ?? []).some((r) => urlKey(String(r.url)) === key)) {
      throw new ToolInputError("Esse link acabou de ser salvo por outra pessoa. Não salvei de novo.");
    }
    await createReferencePin({
      title: p.title,
      url: p.url,
      thumb_url: p.thumb_url,
      kind: p.kind,
      note: p.note,
      client: p.client,
      client_id: p.client_id,
      tags: p.tags,
      drive_file_id: "",
    });
    return `Referência salva${p.title ? `: ${p.title}` : ""}${p.client ? ` (${p.client})` : ""}. Já está no mural de Referências.`;
  },
};

export const searchReferences: ReadTool = {
  kind: "read",
  name: "search_reference",
  topic: "referencias",
  description:
    "Procura referências salvas (mural de Referências) por texto, cliente ou tag. " +
    "Sem filtro devolve as mais recentes.",
  parameters: looseSchema({
    query: { type: ["string", "null"], description: "Palavras do título, nota, link ou tags." },
    client: { type: ["string", "null"], description: "Só as desse cliente." },
    tag: { type: ["string", "null"], description: "Só com essa tag." },
    limit: { type: ["integer", "null"], description: "Máximo (padrão 10, até 30)." },
  }),
  async run(actor, args) {
    assertSection(actor, "referencias");
    const query = optString(args, "query", 100);
    const tag = optString(args, "tag", 40);
    const limit = optInt(args, "limit", 1, 30, 10);
    const clientQuery = optString(args, "client", 100);
    const client = clientQuery ? await resolveClient(actor, clientQuery) : null;

    let q = getSupabaseServerClient()
      .from("reference_pins")
      .select("id, title, url, note, client, client_id, tags, kind, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (client) q = q.eq("client_id", client.id);
    const { data, error } = await q;
    if (error) throw error;

    const scope = clientScope(actor);
    const words = query ? normalizeName(query).split(" ") : [];
    const tagKeyed = tag ? normalizeName(tag) : null;
    const rows = (data ?? []).filter((r) => {
      // Escopo restrito: referência geral e dos próprios clientes; a de cliente fora do acesso some.
      if (scope !== null && r.client_id && !scope.includes(r.client_id as string)) return false;
      if (scope !== null && !r.client_id && r.client) return false;
      const tags = (r.tags as string[]) ?? [];
      if (tagKeyed && !tags.some((t) => normalizeName(t) === tagKeyed)) return false;
      if (words.length) {
        const hay = normalizeName([r.title, r.note, r.url, r.client, tags.join(" ")].join(" "));
        return words.every((w) => hay.includes(w));
      }
      return true;
    });

    return {
      total: rows.length,
      itens: rows.slice(0, limit).map((r) => ({
        titulo: r.title || r.url,
        link: r.url,
        cliente: r.client || "geral",
        tags: r.tags,
        nota: String(r.note ?? "").slice(0, 200),
        salva_em: String(r.created_at).slice(0, 10).split("-").reverse().join("/"),
      })),
    };
  },
};

// -------------------------------------------------------------- biblioteca

type SaveLibraryParams = { url: string; title: string; description: string; tags: string[] };

export const saveLibraryLink: WriteTool<SaveLibraryParams> = {
  kind: "write",
  name: "save_library_link",
  topic: "referencias",
  description:
    "Salva um link na Biblioteca geral da equipe: ferramenta, site, tutorial, recurso útil. " +
    "Pede confirmação. NÃO é para inspiração criativa de conteúdo (isso é save_reference).",
  parameters: looseSchema({
    url: { type: "string" },
    title: { type: ["string", "null"], description: "Nome da ferramenta/site; vazio = o da página." },
    description: { type: ["string", "null"], description: "Para que serve, em uma frase." },
    tags: tagsProperty,
  }),

  async prepare(actor, args) {
    assertSection(actor, "biblioteca");
    const rawUrl = reqString(args, "url", 2000);
    const url = firstUrl(rawUrl) ?? rawUrl;
    const key = urlKey(url);
    if (!key) throw new ToolInputError("Esse link não parece válido (precisa começar com http).");

    const { data: existing, error } = await getSupabaseServerClient().from("library_links").select("title, url");
    if (error) throw error;
    const dup = (existing ?? []).find((r) => urlKey(String(r.url)) === key);
    if (dup) throw new ToolInputError(`Esse link já está na Biblioteca${dup.title ? ` (${dup.title})` : ""}. Não salvei de novo.`);

    const [meta, knownTags] = await Promise.all([fetchLinkMeta(url), listLibraryTags()]);
    const title = optString(args, "title", 200) ?? meta?.title ?? "";
    if (!title) throw new ToolInputError("Não consegui descobrir o nome desse link. Pergunte como chamar.");
    const description = optString(args, "description", 500) ?? meta?.description?.slice(0, 300) ?? "";
    const tags = cleanTags(args.tags, knownTags);

    return {
      summary: [
        "Salvar na Biblioteca",
        `Nome: ${title}`,
        `Link: ${url}`,
        description ? `Descrição: ${description}` : null,
        tags.length ? `Tags: ${tags.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      params: { url, title, description, tags },
    };
  },

  async execute(actor, p) {
    assertSection(actor, "biblioteca");
    const key = urlKey(p.url);
    const { data: existing } = await getSupabaseServerClient().from("library_links").select("url");
    if ((existing ?? []).some((r) => urlKey(String(r.url)) === key)) {
      throw new ToolInputError("Esse link acabou de ser salvo por outra pessoa. Não salvei de novo.");
    }
    await createLibraryLink({ title: p.title, url: p.url, description: p.description, tags: p.tags, icon_url: "" });
    return `Salvo na Biblioteca: ${p.title}.`;
  },
};

export const searchLibrary: ReadTool = {
  kind: "read",
  name: "search_library",
  topic: "referencias",
  description: "Procura links da Biblioteca geral (ferramentas e sites da equipe) por texto ou tag.",
  parameters: looseSchema({
    query: { type: ["string", "null"], description: "Palavras do nome, descrição, link ou tags." },
    limit: { type: ["integer", "null"], description: "Máximo (padrão 10, até 30)." },
  }),
  async run(actor, args) {
    assertSection(actor, "biblioteca");
    const query = optString(args, "query", 100);
    const limit = optInt(args, "limit", 1, 30, 10);
    const { data, error } = await getSupabaseServerClient()
      .from("library_links")
      .select("title, url, description, tags")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const words = query ? normalizeName(query).split(" ") : [];
    const rows = (data ?? []).filter((r) => {
      if (!words.length) return true;
      const hay = normalizeName([r.title, r.description, r.url, ((r.tags as string[]) ?? []).join(" ")].join(" "));
      return words.every((w) => hay.includes(w));
    });
    return {
      total: rows.length,
      itens: rows.slice(0, limit).map((r) => ({ nome: r.title, link: r.url, descricao: r.description, tags: r.tags })),
    };
  },
};
