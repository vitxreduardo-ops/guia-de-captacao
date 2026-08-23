"use client";

import { useMemo, useState, useTransition } from "react";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createLibraryLinkAction,
  deleteLibraryLinkAction,
  updateLibraryLinkAction,
} from "@/app/admin/biblioteca/actions";
import { buildTagSpellingMap, tagKey } from "@/lib/tags";
import type { LibraryLink } from "@/lib/library";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

type SortOrder = "recent" | "az";

/** Domínio limpo do link, usado como legenda do card e como base do favicon. */
function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Sem acento e em minúscula, pra busca não depender de "vídeo" vs "video". */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Logo do link, em três degraus: o `icon_url` cadastrado, o favicon do próprio
 * domínio (por `/api/favicon`, que evita ter que subir uma imagem por link) e,
 * se nenhum carregar, a inicial do título. O primeiro degrau falha com certa
 * frequência — endereço de imagem colado de outro site costuma expirar ou
 * recusar uso fora da origem dele —, e é justamente por isso que ele cai no
 * favicon antes de desistir.
 */
function LibraryIcon({ link }: { link: LibraryLink }) {
  const host = linkHost(link.url);
  const sources = [
    link.icon_url,
    host ? `/api/favicon?domain=${encodeURIComponent(host)}` : "",
  ].filter(Boolean);

  // Guardar quais endereços falharam, em vez de contar falhas: em
  // desenvolvimento o React monta duas vezes, e um contador pularia o degrau
  // do meio ao ouvir a mesma falha duas vezes.
  const [failed, setFailed] = useState<string[]>([]);
  const src = sources.find((candidate) => !failed.includes(candidate));

  function markFailed(candidate: string) {
    setFailed((current) =>
      current.includes(candidate) ? current : [...current, candidate]
    );
  }

  if (!src) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-sm font-medium text-neutral-500">
        {link.title.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }

  return (
    // Favicon de domínio arbitrário: `next/image` exigiria liberar host por
    // host em `images.remotePatterns`, então aqui é `img` mesmo.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      onError={() => markFailed(src)}
      ref={(node) => {
        // `onError` não pega a imagem que já chegou quebrada: ela vem no HTML
        // do servidor e falha antes da hidratação pendurar o handler.
        if (node?.complete && node.naturalWidth === 0) markFailed(src);
      }}
      className="size-9 shrink-0 rounded-md border border-neutral-200 bg-white object-contain p-1"
    />
  );
}

/** Campos compartilhados por "novo link" e "editar link". */
function LinkForm({
  link,
  suggestedTags,
  onDone,
}: {
  link: LibraryLink | null;
  suggestedTags: string[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tags, setTags] = useState(link?.tags.join(", ") ?? "");

  const used = new Set(
    tags
      .split(",")
      .map((tag) => tagKey(tag))
      .filter(Boolean)
  );

  function addTag(tag: string) {
    setTags((current) => (current.trim() ? `${current.trim()}, ${tag}` : tag));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      if (link) await updateLibraryLinkAction(formData);
      else await createLibraryLinkAction(formData);
      onDone();
    });
  }

  return (
    <form id="library-link-form" onSubmit={handleSubmit} className="grid gap-3">
      {link ? <input type="hidden" name="id" value={link.id} /> : null}

      <div>
        <label className={labelClass} htmlFor="library-title">
          Título
        </label>
        <input
          id="library-title"
          name="title"
          defaultValue={link?.title ?? ""}
          placeholder="Cosmos"
          required
          autoFocus
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="library-url">
          URL
        </label>
        <input
          id="library-url"
          name="url"
          defaultValue={link?.url ?? ""}
          placeholder="https://..."
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="library-description">
          Descrição
        </label>
        <input
          id="library-description"
          name="description"
          defaultValue={link?.description ?? ""}
          placeholder="Banco diferentão de referências"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="library-tags">
          Tags
        </label>
        <input
          id="library-tags"
          name="tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="referência, imagem, gratuito"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">Separe por vírgula.</p>

        {/* Clicar numa tag já em uso é mais rápido que redigitar, e é o que
            impede o acervo de encher de variação da mesma palavra. As já
            escolhidas ficam apagadas em vez de sumir: retirá-las encolheria o
            diálogo no meio da digitação e o "Salvar" fugiria do cursor. */}
        {suggestedTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestedTags.map((tag) => {
              const chosen = used.has(tagKey(tag));
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={chosen}
                  onClick={() => addTag(tag)}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    chosen
                      ? "bg-neutral-50 text-neutral-300"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {chosen ? tag : `+ ${tag}`}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="library-icon">
          Logo (opcional)
        </label>
        <input
          id="library-icon"
          name="icon_url"
          defaultValue={link?.icon_url ?? ""}
          placeholder="https://.../logo.png"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Em branco, usa o favicon do próprio site.
        </p>
      </div>

      <input type="submit" hidden disabled={pending} />
    </form>
  );
}

export function LibraryBrowser({ links }: { links: LibraryLink[] }) {
  const [query, setQuery] = useState("");
  /** Guardadas por chave normalizada, não pela grafia — ver `lib/tags.ts`. */
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOrder>("recent");
  /** `null` = fechado, `"new"` = criando, objeto = editando aquele link. */
  const [editing, setEditing] = useState<LibraryLink | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  // Grafias divergentes da mesma tag viram uma só na interface, mesmo que o
  // banco ainda guarde as duas de antes da canonicalização entrar.
  const spelling = useMemo(
    () => buildTagSpellingMap(links.flatMap((link) => link.tags)),
    [links]
  );

  const allTags = useMemo(
    () => [...spelling.values()].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [spelling]
  );

  const visible = useMemo(() => {
    const term = normalize(query.trim());

    const filtered = links.filter((link) => {
      // Tags marcadas somam em vez de estreitar: com poucos links por tag, o
      // "e" quase sempre daria lista vazia.
      if (
        activeTags.length > 0 &&
        !link.tags.some((tag) => activeTags.includes(tagKey(tag)))
      ) {
        return false;
      }
      if (!term) return true;

      const haystack = normalize(
        [link.title, link.description, linkHost(link.url), ...link.tags].join(" ")
      );
      return haystack.includes(term);
    });

    return sort === "az"
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
      : filtered;
  }, [links, query, activeTags, sort]);

  function toggleTag(tag: string) {
    const key = tagKey(tag);
    setActiveTags((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  function handleDelete(link: LibraryLink) {
    if (!window.confirm(`Excluir o link "${link.title}"?`)) return;
    const formData = new FormData();
    formData.set("id", link.id);
    startTransition(async () => {
      await deleteLibraryLinkAction(formData);
    });
  }

  const hasFilters = query.trim().length > 0 || activeTags.length > 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, descrição, site ou tag..."
            aria-label="Buscar na biblioteca"
            className={`${inputClass} pl-9 ${query ? "pr-9" : ""}`}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOrder)}
          aria-label="Ordenar"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          <option value="recent">Mais recentes</option>
          <option value="az">A–Z</option>
        </select>

        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <PlusIcon className="size-4" />
          Adicionar link
        </button>
      </div>

      {allTags.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          {allTags.map((tag) => {
            const active = activeTags.includes(tagKey(tag));
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {tag}
              </button>
            );
          })}
          {activeTags.length > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTags([])}
              className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900"
            >
              Limpar tags
            </button>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {links.length === 0
            ? "Nenhum link cadastrado ainda. Use “Adicionar link” para começar."
            : "Nenhum link encontrado com essa busca."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((link) => {
            const host = linkHost(link.url);
            return (
              <li
                key={link.id}
                className={`group relative flex flex-col rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 ${
                  pending ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3 pr-14">
                  {/* A chave carrega o `icon_url` pra que trocar o logo
                      recomece a cadeia em vez de manter o degrau que falhou. */}
                  <LibraryIcon key={link.icon_url} link={link} />
                  <div className="min-w-0 flex-1">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-medium text-neutral-900 hover:underline"
                    >
                      {link.title}
                    </a>
                    {host ? (
                      <p className="truncate text-xs text-neutral-400">{host}</p>
                    ) : null}
                  </div>
                </div>

                {link.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                    {link.description}
                  </p>
                ) : null}

                {link.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {link.tags.map((tag) => {
                      const key = tagKey(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                            activeTags.includes(key)
                              ? "bg-neutral-900 text-white"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          {spelling.get(key) ?? tag}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* Só aparecem no hover/foco pra não competir com o conteúdo,
                    mas seguem no DOM e alcançáveis pelo teclado. */}
                <div className="absolute top-3 right-3 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditing(link)}
                    aria-label={`Editar ${link.title}`}
                    className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(link)}
                    aria-label={`Excluir ${link.title}`}
                    className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasFilters && visible.length > 0 ? (
        <p className="mt-4 text-xs text-neutral-500">
          {visible.length} de {links.length} links
        </p>
      ) : null}

      {editing ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="w-[calc(100%-3rem)] max-w-lg gap-3 p-5 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editing === "new" ? "Novo link" : "Editar link"}
              </DialogTitle>
            </DialogHeader>

            <LinkForm
              link={editing === "new" ? null : editing}
              suggestedTags={allTags}
              onDone={() => setEditing(null)}
            />

            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="library-link-form"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {editing === "new" ? "Adicionar" : "Salvar"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
