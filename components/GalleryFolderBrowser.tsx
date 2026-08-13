"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LightboxImage } from "@/components/LightboxImage";
import type { GalleryDisplayItem, GalleryFolderNode } from "@/lib/galleries";

type SortKey = "name" | "date" | "recent";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Nome" },
  { value: "date", label: "Mês" },
  { value: "recent", label: "Última adição" },
];

function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((option) => option.value === value)!;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:border-neutral-400"
      >
        Ordenar: {current.label}
        <span
          aria-hidden
          className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-xs hover:bg-neutral-50 ${
                  option.value === value
                    ? "font-medium text-neutral-900"
                    : "text-neutral-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function findNode(
  root: GalleryFolderNode,
  path: string[]
): GalleryFolderNode | null {
  let node = root;
  for (const segment of path) {
    const next = node.folders.find((folder) => folder.name === segment);
    if (!next) return null;
    node = next;
  }
  return node;
}

function sortFolders(folders: GalleryFolderNode[], sortKey: SortKey) {
  const copy = [...folders];
  if (sortKey === "recent") {
    copy.sort(
      (a, b) =>
        new Date(b.latestAddedAt).getTime() - new Date(a.latestAddedAt).getTime()
    );
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  }
  return copy;
}

function sortItems(items: GalleryDisplayItem[], sortKey: SortKey) {
  const copy = [...items];
  if (sortKey === "name") {
    copy.sort((a, b) => a.caption.localeCompare(b.caption, "pt-BR", { numeric: true }));
  } else if (sortKey === "date") {
    copy.sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
    );
  } else {
    copy.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return copy;
}

/** Todos os itens de imagem (renderáveis) dentro de uma pasta, pra navegação
 * do lightbox ficar restrita ao que está sendo visto ali. */
function imageItemsOf(items: GalleryDisplayItem[]): GalleryDisplayItem[] {
  return items.filter((item) => item.kind === "image");
}

function GalleryTile({
  item,
  className,
  gallery,
}: {
  item: GalleryDisplayItem;
  className: string;
  gallery: {
    id: string;
    src: string;
    fullSrc: string;
    downloadSrc: string;
    alt: string;
    sourceUrl: string | null;
  }[];
}) {
  if (item.kind === "video") {
    return (
      <a
        href={item.downloadSrc}
        download
        className="block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbSrc}
          alt={item.caption || "Vídeo"}
          className={`${className} bg-black cursor-pointer transition-opacity hover:opacity-75`}
        />
      </a>
    );
  }

  if (item.kind === "image") {
    return (
      <LightboxImage
        id={item.id}
        src={item.thumbSrc}
        fullSrc={item.previewSrc}
        downloadSrc={item.downloadSrc}
        alt={item.caption || "Foto"}
        sourceUrl={item.sourceUrl}
        className={`${className} block`}
        gallery={gallery}
        index={gallery.findIndex((g) => g.id === item.id)}
      />
    );
  }

  return (
    <a
      href={item.sourceUrl ?? item.previewSrc}
      target="_blank"
      rel="noreferrer"
      className="block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.thumbSrc}
        alt={item.caption || "Arquivo"}
        className={className}
      />
    </a>
  );
}

export function GalleryFolderBrowser({
  root,
  clientName,
}: {
  root: GalleryFolderNode;
  clientName: string;
}) {
  const [path, setPath] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [search, setSearch] = useState("");
  const prefersReducedMotion = useReducedMotion();

  const current = useMemo(() => findNode(root, path) ?? root, [root, path]);
  const query = search.trim().toLowerCase();
  const sortedFolders = useMemo(() => {
    const folders = query
      ? current.folders.filter((folder) =>
          folder.name.toLowerCase().includes(query)
        )
      : current.folders;
    return sortFolders(folders, sortKey);
  }, [current, sortKey, query]);
  const sortedItems = useMemo(() => {
    const items = query
      ? current.items.filter((item) =>
          (item.caption || "").toLowerCase().includes(query)
        )
      : current.items;
    return sortItems(items, sortKey);
  }, [current, sortKey, query]);
  const gallery = useMemo(
    () =>
      imageItemsOf(sortedItems).map((item) => ({
        id: item.id,
        src: item.thumbSrc,
        fullSrc: item.previewSrc,
        downloadSrc: item.downloadSrc,
        alt: item.caption || "Foto",
        sourceUrl: item.sourceUrl,
      })),
    [sortedItems]
  );

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, bounce: 0, duration: 0.3 };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
          <button
            type="button"
            onClick={() => setPath([])}
            className={`rounded px-1.5 py-0.5 hover:bg-neutral-100 hover:text-neutral-900 ${
              path.length === 0 ? "font-medium text-neutral-900" : ""
            }`}
          >
            {clientName}
          </button>
          {path.map((segment, index) => (
            <span key={segment} className="flex items-center gap-1">
              <span className="text-neutral-300">/</span>
              <button
                type="button"
                onClick={() => setPath(path.slice(0, index + 1))}
                className={`rounded px-1.5 py-0.5 hover:bg-neutral-100 hover:text-neutral-900 ${
                  index === path.length - 1
                    ? "font-medium text-neutral-900"
                    : ""
                }`}
              >
                {segment}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar..."
            className="w-32 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none sm:w-48"
          />
          <SortMenu value={sortKey} onChange={setSortKey} />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={path.join("/")}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring}
        >
          {sortedFolders.length > 0 ? (
            <div className="mb-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {sortedFolders.map((folder, folderIndex) => (
                <button
                  key={folder.path}
                  type="button"
                  onClick={() => setPath([...path, folder.name])}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 active:bg-neutral-100 ${
                    folderIndex > 0 ? "border-t border-neutral-200" : ""
                  }`}
                >
                  <span aria-hidden className="text-neutral-400">
                    📁
                  </span>
                  <span className="flex-1">{folder.name}</span>
                  <span aria-hidden className="text-neutral-300">
                    ›
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {sortedItems.length > 0 ? (
            <div className="columns-2 gap-3 sm:columns-3">
              {sortedItems.map((item, itemIndex) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0.15 }
                      : {
                          type: "spring",
                          bounce: 0,
                          duration: 0.4,
                          delay: Math.min(itemIndex * 0.04, 0.6),
                        }
                  }
                  className="mb-3 break-inside-avoid overflow-hidden rounded-md border border-neutral-200 bg-white"
                >
                  <GalleryTile item={item} className="w-full" gallery={gallery} />
                </motion.div>
              ))}
            </div>
          ) : sortedFolders.length === 0 ? (
            <p className="text-center text-sm text-neutral-500">
              {query ? "Nada encontrado." : "Nenhuma foto nessa pasta."}
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
