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
 * Logo do link. Sem `icon_url` cadastrado, cai no favicon que o Google serve a
 * partir do domínio — evita ter que subir uma imagem por link. Quando nem isso
 * carrega, sobra a inicial do título.
 */
function LibraryIcon({ link }: { link: LibraryLink }) {
  const host = linkHost(link.url);
  const src =
    link.icon_url ||
    (host
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
      : "");
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
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
      src={src}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      onError={() => setBroken(true)}
      className="size-9 shrink-0 rounded-md border border-neutral-200 bg-white object-contain p-1"
    />
  );
}

/** Campos compartilhados por "novo link" e "editar link". */
function LinkForm({
  link,
  onDone,
}: {
  link: LibraryLink | null;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

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
          defaultValue={link?.tags.join(", ") ?? ""}
          placeholder="referência, imagem, gratuito"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">Separe por vírgula.</p>
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
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOrder>("recent");
  /** `null` = fechado, `"new"` = criando, objeto = editando aquele link. */
  const [editing, setEditing] = useState<LibraryLink | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const allTags = useMemo(
    () =>
      Array.from(new Set(links.flatMap((link) => link.tags)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [links]
  );

  const visible = useMemo(() => {
    const term = normalize(query.trim());

    const filtered = links.filter((link) => {
      // Tags marcadas somam em vez de estreitar: com poucos links por tag, o
      // "e" quase sempre daria lista vazia.
      if (
        activeTags.length > 0 &&
        !link.tags.some((tag) => activeTags.includes(tag))
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
    setActiveTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
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
            const active = activeTags.includes(tag);
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
                  <LibraryIcon link={link} />
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
                    {link.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                          activeTags.includes(tag)
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
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
