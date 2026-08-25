"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GalleryThumb } from "@/components/GalleryThumb";
import { LightboxImage } from "@/components/LightboxImage";
import { VideoLightbox } from "@/components/VideoLightbox";
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

/**
 * Cartão em modo de seleção: a miniatura não abre mais o lightbox, o clique
 * inteiro marca/desmarca. Fica proposital que seja o card todo e não só a
 * caixinha — no celular acertar um alvo pequeno em cima da foto é ruim.
 */
function SelectableTile({
  item,
  className,
  selected,
  onToggle,
}: {
  item: GalleryDisplayItem;
  className: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className="relative block w-full overflow-hidden rounded-lg text-left"
    >
      <GalleryThumb
        src={item.thumbSrc}
        alt={item.caption || "Arquivo"}
        caption={item.caption}
        className={`${className} rounded-lg transition ${
          selected ? "opacity-90 ring-2 ring-neutral-900" : ""
        }`}
      />
      <span
        aria-hidden
        className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition ${
          selected
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-white/70 bg-black/25 text-transparent backdrop-blur-sm"
        }`}
      >
        ✓
      </span>
      {item.kind === "video" ? (
        <span
          aria-hidden
          className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
        >
          vídeo
        </span>
      ) : null}
    </button>
  );
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
      <VideoLightbox
        src={item.previewSrc}
        poster={item.thumbSrc}
        downloadSrc={item.downloadSrc}
        caption={item.caption}
        className={className}
      />
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
        className={`${className} block rounded-lg`}
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
      <GalleryThumb
        src={item.thumbSrc}
        alt={item.caption || "Arquivo"}
        caption={item.caption}
        className={className}
      />
    </a>
  );
}

/** Todos os itens dentro de uma pasta, incluindo subpastas. */
function allItemsOf(node: GalleryFolderNode): GalleryDisplayItem[] {
  return [
    ...node.items,
    ...node.folders.flatMap((folder) => allItemsOf(folder)),
  ];
}

export function GalleryFolderBrowser({
  root,
  clientName,
  slug,
}: {
  root: GalleryFolderNode;
  clientName: string;
  slug: string;
}) {
  const [path, setPath] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadStarted, setDownloadStarted] = useState(false);
  /** Progresso do download um-a-um: quantos arquivos já foram disparados. */
  const [oneByOneDone, setOneByOneDone] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  // Começa em 3 (o mesmo que o servidor renderiza) e ajusta depois de montar,
  // pra não dar diferença entre o HTML do servidor e a primeira renderização
  // no cliente.
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");
    function sync() {
      setColumnCount(query.matches ? 3 : 2);
    }
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  /** Todos os itens da galeria por id — a seleção atravessa pastas, então o
   * download precisa achar item que não está mais na tela. */
  const itemsById = useMemo(() => {
    const map = new Map<string, GalleryDisplayItem>();
    allItemsOf(root).forEach((item) => map.set(item.id, item));
    return map;
  }, [root]);

  /**
   * Baixa um arquivo de cada vez, direto do link original — sem zip.
   *
   * Vale quando a seleção é pequena ou quando esperar o zip inteiro ficar
   * pronto atrapalha: aqui cada arquivo começa a baixar na hora. O intervalo
   * entre os cliques existe porque navegador ignora downloads disparados em
   * rajada; e o navegador ainda pode pedir permissão pra "baixar vários
   * arquivos" na primeira vez.
   */
  async function downloadOneByOne() {
    const items = selectedIds
      .map((id) => itemsById.get(id))
      .filter((item): item is GalleryDisplayItem => Boolean(item));

    setOneByOneDone(0);
    for (const [index, item] of items.entries()) {
      const anchor = document.createElement("a");
      anchor.href = item.downloadSrc;
      anchor.download = item.caption || "";
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setOneByOneDone(index + 1);
      if (index < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
    setTimeout(() => setOneByOneDone(null), 4000);
  }

  function toggleIds(ids: string[], nextSelected: boolean) {
    setSelectedIds((current) => {
      if (nextSelected) {
        const merged = new Set(current);
        ids.forEach((id) => merged.add(id));
        return [...merged];
      }
      const removed = new Set(ids);
      return current.filter((id) => !removed.has(id));
    });
  }

  const visibleIds = useMemo(
    () => sortedItems.map((item) => item.id),
    [sortedItems]
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  // Sai do modo de seleção com Esc, como qualquer outra tela modal do app.
  useEffect(() => {
    if (!selecting) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelecting(false);
        setSelectedIds([]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selecting]);

  // O zip sai como navegação normal do navegador, então não há evento de
  // "terminou" pra ouvir — o aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!downloadStarted) return;
    const timeout = setTimeout(() => setDownloadStarted(false), 8000);
    return () => clearTimeout(timeout);
  }, [downloadStarted]);

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, bounce: 0, duration: 0.3 };

  // Distribui os itens nas colunas em rodízio (item 0 → coluna 0, item 1 →
  // coluna 1, ...), o que dá a ordem de leitura da esquerda pra direita
  // (1-2-3 / 4-5-6) que `columns` do CSS não dá — lá a ordem é de cima pra
  // baixo. Cada coluna empilha os itens colados, sem os buracos que o
  // alinhamento por linha deixava embaixo das fotos mais baixas.
  const columns = useMemo(() => {
    const buckets: { item: GalleryDisplayItem; index: number }[][] =
      Array.from({ length: columnCount }, () => []);
    sortedItems.forEach((item, index) => {
      buckets[index % columnCount].push({ item, index });
    });
    return buckets;
  }, [sortedItems, columnCount]);

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
          <button
            type="button"
            onClick={() => {
              setSelecting((value) => !value);
              setSelectedIds([]);
            }}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              selecting
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
            }`}
          >
            {selecting ? "Cancelar" : "Selecionar"}
          </button>
        </div>
      </div>

      {selecting ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs text-neutral-500">
          <span>
            Toque nas fotos pra escolher o que baixar. A seleção continua
            valendo ao entrar e sair das pastas.
          </span>
          {visibleIds.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleIds(visibleIds, !allVisibleSelected)}
              className="ml-auto rounded-md border border-neutral-300 px-2.5 py-1 font-medium text-neutral-700 hover:border-neutral-400"
            >
              {allVisibleSelected
                ? "Desmarcar esta pasta"
                : "Selecionar esta pasta"}
            </button>
          ) : null}
        </div>
      ) : null}

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
              {sortedFolders.map((folder, folderIndex) => {
                const folderIds = selecting
                  ? allItemsOf(folder).map((item) => item.id)
                  : [];
                const folderSelected =
                  folderIds.length > 0 &&
                  folderIds.every((id) => selected.has(id));

                return (
                  <div
                    key={folder.path}
                    className={`flex items-center ${
                      folderIndex > 0 ? "border-t border-neutral-200" : ""
                    }`}
                  >
                    {selecting ? (
                      <button
                        type="button"
                        onClick={() => toggleIds(folderIds, !folderSelected)}
                        aria-pressed={folderSelected}
                        aria-label={`Selecionar tudo em ${folder.name}`}
                        disabled={folderIds.length === 0}
                        className="py-3 pl-4 pr-1"
                      >
                        <span
                          aria-hidden
                          className={`flex h-5 w-5 items-center justify-center rounded border text-[11px] font-semibold ${
                            folderSelected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-300 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setPath([...path, folder.name])}
                      className="flex flex-1 items-center gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
                    >
                      <span aria-hidden className="text-neutral-400">
                        📁
                      </span>
                      <span className="flex-1">{folder.name}</span>
                      <span aria-hidden className="text-neutral-300">
                        ›
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {sortedItems.length > 0 ? (
            <div className="flex items-start gap-3">
              {columns.map((column, columnIndex) => (
                <div
                  key={columnIndex}
                  className="flex min-w-0 flex-1 flex-col gap-3"
                >
                  {column.map(({ item, index }) => (
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
                              delay: Math.min(index * 0.04, 0.6),
                            }
                      }
                    >
                      {selecting ? (
                        <SelectableTile
                          item={item}
                          className="w-full"
                          selected={selected.has(item.id)}
                          onToggle={() =>
                            toggleIds([item.id], !selected.has(item.id))
                          }
                        />
                      ) : (
                        <GalleryTile
                          item={item}
                          className="w-full"
                          gallery={gallery}
                        />
                      )}
                      {item.caption ? (
                        <p
                          title={item.caption}
                          className="mt-1.5 line-clamp-2 px-0.5 text-[11px] leading-tight text-neutral-500"
                        >
                          {item.caption}
                        </p>
                      ) : null}
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          ) : sortedFolders.length === 0 ? (
            <p className="text-center text-sm text-neutral-500">
              {query ? "Nada encontrado." : "Nenhuma foto nessa pasta."}
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selecting && selectedIds.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={spring}
            className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4"
          >
            <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900">
                  {selectedIds.length}{" "}
                  {selectedIds.length === 1
                    ? "arquivo selecionado"
                    : "arquivos selecionados"}
                </p>
                <p className="text-xs text-neutral-500">
                  {oneByOneDone !== null
                    ? `Baixando um por um: ${oneByOneDone} de ${selectedIds.length}. O navegador pode pedir permissão pra baixar vários arquivos.`
                    : downloadStarted
                      ? "Preparando o .zip — o download começa em instantes. Não feche a página."
                      : "Um .zip só (mantém as pastas) ou os arquivos separados, um de cada vez."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:border-neutral-400"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={downloadOneByOne}
                disabled={oneByOneDone !== null}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:border-neutral-400 disabled:cursor-not-allowed disabled:text-neutral-400"
              >
                {oneByOneDone !== null ? (
                  <span
                    aria-hidden
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700"
                  />
                ) : null}
                Baixar separadas
              </button>

              <form
                action={`/api/galeria/${slug}/zip`}
                method="post"
                onSubmit={() => setDownloadStarted(true)}
              >
                <input type="hidden" name="ids" value={selectedIds.join(",")} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  {downloadStarted ? (
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                  ) : null}
                  Baixar .zip
                </button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
