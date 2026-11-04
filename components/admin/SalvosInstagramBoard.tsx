"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckIcon, ChevronDownIcon, ExternalLinkIcon, PencilIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateSavedPostAction } from "@/app/admin/referencias/salvos/actions";
import { buildTagSpellingMap, tagKey } from "@/lib/tags";
import type { SavedCollection, SavedPost, SavedStatus } from "@/lib/salvosInstagram";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

function normalize(v: string) {
  return v.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const UPDATE_PROMPT =
  "Atualize os Salvos do Instagram: varra as coleções com o scan.js (atualizar.py known), rode o atualizar.py merge e depois node scripts/sincronizar-salvos-instagram.mjs --apply no Guia de captação.";

function postUrl(p: SavedPost) {
  return `https://www.instagram.com/${p.type}/${p.id}/`;
}

export function SalvosInstagramBoard({
  collections,
  posts,
  status,
}: {
  collections: SavedCollection[];
  posts: SavedPost[];
  status: SavedStatus;
}) {
  const [tab, setTab] = useState("todos");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavedPost | null>(null);
  const [viewing, setViewing] = useState<SavedPost | null>(null);
  const [copied, setCopied] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // O scan precisa do Instagram logado no navegador do Mac, então não roda
  // daqui: o botão entrega o pedido pronto pra colar no Claude.
  async function copyUpdatePrompt() {
    try {
      await navigator.clipboard.writeText(UPDATE_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copie e cole no Claude:", UPDATE_PROMPT);
    }
  }

  const spelling = useMemo(
    () => buildTagSpellingMap(posts.flatMap((p) => p.tags)),
    [posts]
  );
  const allTags = useMemo(
    () => [...new Set(posts.flatMap((p) => p.tags).map((t) => spelling.get(tagKey(t)) ?? t))].sort(),
    [posts, spelling]
  );
  const clients = useMemo(
    () => [...new Set(posts.map((p) => p.client).filter(Boolean))].sort(),
    [posts]
  );

  const tabName = tab === "todos" ? "Todas as coleções" : (collections.find((c) => c.key === tab)?.name ?? "Coleção");

  const visible = posts.filter((p) => {
    if (tab !== "todos" && p.collection_key !== tab) return false;
    if (tagFilter && !p.tags.some((t) => tagKey(t) === tagKey(tagFilter))) return false;
    const q = normalize(query.trim());
    if (!q) return true;
    return normalize([p.label, p.creator, p.client, p.note, ...p.tags].join(" ")).includes(q);
  });

  const countOf = (key: string) =>
    key === "todos" ? posts.length : posts.filter((p) => p.collection_key === key).length;

  function save(formData: FormData) {
    startTransition(async () => {
      await updateSavedPostAction(formData);
      setEditing(null);
    });
  }

  if (posts.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Nada importado ainda. Rode <code>node scripts/sincronizar-salvos-instagram.mjs</code>.
      </p>
    );
  }

  const when = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
      : "";

  return (
    <>
      {status.state === "login" ? (
        <div role="alert" className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>A conta do Instagram caiu.</strong> A última tentativa de atualizar foi em {when(status.checked_at)} e parou
          na tela de login. Entre de novo no Instagram no navegador do Claude; a próxima varredura volta ao normal.
        </div>
      ) : null}
      {status.ok_at ? (
        <p className="mb-2 text-xs text-neutral-500">Última atualização: {when(status.ok_at)}</p>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Popover open={listOpen} onOpenChange={setListOpen}>
          <PopoverTrigger className="flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">
            {tabName} <span className="text-neutral-500">{countOf(tab)}</span>
            <ChevronDownIcon className="size-4 text-neutral-500" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1">
            {[{ key: "todos", name: "Todas as coleções" }, ...collections].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setTab(c.key);
                  setListOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-neutral-100"
              >
                <span className={tab === c.key ? "font-semibold" : ""}>{c.name}</span>
                <span className="flex items-center gap-1.5 text-neutral-500">
                  {countOf(c.key)}
                  {tab === c.key ? <CheckIcon className="size-4" /> : null}
                </span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      <div className="relative w-full max-w-md">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, tag, cliente ou anotação..."
          aria-label="Buscar nos salvos"
          className={`${inputClass} pl-9`}
        />
      </div>
      <button
        type="button"
        onClick={copyUpdatePrompt}
        title="Copia o pedido pra colar no Claude, que varre o Instagram e sincroniza"
        className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        {copied ? <CheckIcon className="size-4" /> : <RefreshCwIcon className="size-4" />}
        {copied ? "Copiado! Cole no Claude" : "Atualizar"}
      </button>
      </div>

      {allTags.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-neutral-500">Tags</span>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              aria-pressed={tagFilter === t}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                tagFilter === t
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {visible.map((p) => (
          <div
            key={`${p.collection_key}/${p.id}`}
            className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-2"
          >
            <button
              type="button"
              onClick={() => setViewing(p)}
              className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-lg bg-neutral-900"
              aria-label={`Ver post: ${p.label}`}
            >
              {p.thumb_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumb_url} alt="" loading="lazy" className="size-full object-cover" />
              ) : null}
              <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {p.type === "reel" ? "Reel" : "Post"}
              </span>
            </button>
            <p className="line-clamp-2 text-[13px] leading-snug text-neutral-800">{p.label || "Sem título"}</p>
            {p.creator ? (
              <a
                href={`https://www.instagram.com/${p.creator}/`}
                target="_blank"
                rel="noreferrer"
                className="self-start truncate text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                @{p.creator}
              </a>
            ) : null}
            {p.client || p.tags.length ? (
              <div className="flex flex-wrap gap-1">
                {p.client ? (
                  <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[11px] text-white">{p.client}</span>
                ) : null}
                {p.tags.map((t) => (
                  <span key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing(p)}
              className="mt-auto flex items-center gap-1 self-start text-xs text-neutral-500 hover:text-neutral-900"
            >
              <PencilIcon className="size-3.5" /> Editar
            </button>
          </div>
        ))}
      </div>
      {visible.length === 0 ? <p className="mt-6 text-sm text-neutral-500">Nenhum salvo com esse filtro.</p> : null}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg p-3">
          <DialogHeader>
            <DialogTitle className="line-clamp-1 pr-6 text-sm">{viewing?.creator ? `@${viewing.creator} · ` : ""}{viewing?.label || "Post do Instagram"}</DialogTitle>
          </DialogHeader>
          {viewing ? (
            <>
              <iframe
                key={viewing.id}
                src={`https://www.instagram.com/${viewing.type}/${viewing.id}/embed/captioned/`}
                title={viewing.label || "Post do Instagram"}
                allow="encrypted-media; autoplay; clipboard-write; fullscreen"
                className="h-[70vh] w-full rounded-md border-0 bg-white"
              />
              <a
                href={postUrl(viewing)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 self-start text-sm text-neutral-600 hover:text-neutral-900"
              >
                <ExternalLinkIcon className="size-4" /> Abrir no Instagram
              </a>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar salvo</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form action={save} key={`${editing.collection_key}/${editing.id}`} className="space-y-3">
              <input type="hidden" name="collection_key" value={editing.collection_key} />
              <input type="hidden" name="id" value={editing.id} />
              <div>
                <label className={labelClass} htmlFor="sv-label">Título</label>
                <input id="sv-label" name="label" defaultValue={editing.label} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="sv-creator">Creator (@ do perfil)</label>
                <input id="sv-creator" name="creator" defaultValue={editing.creator ? `@${editing.creator}` : ""} placeholder="@perfil" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="sv-client">Cliente de referência</label>
                <input id="sv-client" name="client" list="sv-clients" defaultValue={editing.client} className={inputClass} />
                <datalist id="sv-clients">
                  {clients.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass} htmlFor="sv-tags">Tags (separadas por vírgula)</label>
                <input id="sv-tags" name="tags" list="sv-tags-list" defaultValue={editing.tags.join(", ")} className={inputClass} />
                <datalist id="sv-tags-list">
                  {allTags.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass} htmlFor="sv-note">Anotação</label>
                <textarea id="sv-note" name="note" rows={3} defaultValue={editing.note} className={inputClass} />
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  {pending ? "Salvando..." : "Salvar"}
                </button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
