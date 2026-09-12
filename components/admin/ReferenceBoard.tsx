"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createReferencePinAction,
  deleteReferencePinAction,
  updateReferencePinAction,
} from "@/app/admin/referencias/actions";
import { buildTagSpellingMap, tagKey } from "@/lib/tags";
import type { ReferencePin } from "@/lib/referencePins";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

function pinHost(url: string) {
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
 * A capa do card. Nada é hospedado aqui: a miniatura é a imagem que o site de
 * origem publica, então ela pode sumir a qualquer momento — capa assinada
 * (Instagram, Facebook) expira. Por isso o degrau de baixo não é um erro
 * visível, e sim o favicon do domínio sobre um fundo neutro, que ainda
 * identifica de onde a referência veio.
 *
 * Arquivo de vídeo servido direto não tem capa publicada: aí o próprio
 * `<video>` mostra o primeiro quadro, com `preload="metadata"` pra não baixar
 * o clipe inteiro só pra desenhar o mural.
 */
function PinCover({ pin }: { pin: ReferencePin }) {
  const [broken, setBroken] = useState(false);
  const host = pinHost(pin.url);

  if (pin.kind === "video" && !pin.thumb_url) {
    return (
      <video
        src={pin.url}
        muted
        playsInline
        preload="metadata"
        className="w-full bg-neutral-100"
      />
    );
  }

  if (pin.thumb_url && !broken) {
    return (
      // <img> em vez de next/image pra não precisar liberar host por host —
      // a capa vem de um domínio arbitrário, colado pelo usuário.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pin.thumb_url}
        alt={pin.title || host}
        loading="lazy"
        onError={() => setBroken(true)}
        ref={(node) => {
          // `onError` não pega a imagem que já chegou quebrada: ela falha
          // antes da hidratação pendurar o handler.
          if (node?.complete && node.naturalWidth === 0) setBroken(true);
        }}
        className="w-full bg-neutral-100 object-cover"
      />
    );
  }

  return (
    <div className="flex aspect-4/3 items-center justify-center bg-neutral-100">
      {host ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/favicon?domain=${encodeURIComponent(host)}`}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          className="size-7 opacity-60"
        />
      ) : null}
    </div>
  );
}

/** Campos compartilhados por "nova referência" e "editar referência". */
function PinForm({
  pin,
  suggestedTags,
  onDone,
}: {
  pin: ReferencePin | null;
  suggestedTags: string[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tags, setTags] = useState(pin?.tags.join(", ") ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const used = new Set(
    tags
      .split(",")
      .map((tag) => tagKey(tag))
      .filter(Boolean)
  );

  function addTag(tag: string) {
    setTags((current) => (current.trim() ? `${current.trim()}, ${tag}` : tag));
  }

  /**
   * O arquivo sobe antes da gravação, por rota própria, e o formulário segue
   * com o id que voltou. Fazer isso dentro da server action não daria: o
   * corpo de uma action tem limite de poucos MB e um webm estoura.
   */
  async function subirArquivo(file: File) {
    const corpo = new FormData();
    corpo.set("file", file);
    const resposta = await fetch("/api/referencias/upload", {
      method: "POST",
      body: corpo,
    });
    if (!resposta.ok) {
      const { error } = (await resposta.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(error ?? "Falha ao enviar o arquivo");
    }
    return (await resposta.json()) as { fileId: string; kind: string };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    formData.delete("file");
    setErro("");

    startTransition(async () => {
      try {
        if (file instanceof File && file.size > 0) {
          setEnviando(true);
          const { fileId, kind } = await subirArquivo(file);
          formData.set("drive_file_id", fileId);
          formData.set("upload_kind", kind);
        }
        if (pin) await updateReferencePinAction(formData);
        else await createReferencePinAction(formData);
        onDone();
      } catch (causa) {
        setErro(causa instanceof Error ? causa.message : "Falha ao enviar");
      } finally {
        setEnviando(false);
      }
    });
  }

  return (
    <form id="reference-pin-form" onSubmit={handleSubmit} className="grid gap-3">
      {pin ? <input type="hidden" name="id" value={pin.id} /> : null}

      <div>
        <label className={labelClass} htmlFor="pin-url">
          Link
        </label>
        <input
          id="pin-url"
          name="url"
          defaultValue={pin?.drive_file_id ? "" : (pin?.url ?? "")}
          placeholder="https://instagram.com/p/..."
          autoFocus
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Post, vídeo ou imagem. A capa é buscada no próprio link.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="pin-file">
          …ou um arquivo seu
        </label>
        <input
          id="pin-file"
          name="file"
          type="file"
          accept="image/*,video/*"
          className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-800"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Vai pra pasta de referências do Drive. Capa própria, que não expira.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="pin-tags">
          Nicho e tags
        </label>
        <input
          id="pin-tags"
          name="tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="moda, still, luz dura"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">Separe por vírgula.</p>

        {/* Clicar numa tag já em uso é mais rápido que redigitar, e é o que
            impede o acervo de encher de variação da mesma palavra. */}
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
        <label className={labelClass} htmlFor="pin-title">
          Título (opcional)
        </label>
        <input
          id="pin-title"
          name="title"
          defaultValue={pin?.title ?? ""}
          placeholder="Editorial com luz de janela"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="pin-note">
          Anotação (opcional)
        </label>
        <input
          id="pin-note"
          name="note"
          defaultValue={pin?.note ?? ""}
          placeholder="Serve de base pro ensaio de outubro"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="pin-thumb">
          Capa (opcional)
        </label>
        <input
          id="pin-thumb"
          name="thumb_url"
          defaultValue={pin?.thumb_url ?? ""}
          placeholder="https://.../capa.jpg"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Em branco, usa a capa do próprio link. Preencha quando a miniatura
          parar de carregar — a de Instagram e Facebook expira.
        </p>
      </div>

      {erro ? <p className="text-xs text-red-600">{erro}</p> : null}
      {enviando ? (
        <p className="text-xs text-neutral-500">Enviando o arquivo…</p>
      ) : null}

      <input type="submit" hidden disabled={pending} />
    </form>
  );
}

export function ReferenceBoard({ pins }: { pins: ReferencePin[] }) {
  const [query, setQuery] = useState("");
  /** Guardadas por chave normalizada, não pela grafia — ver `lib/tags.ts`. */
  const [activeTags, setActiveTags] = useState<string[]>([]);
  /** `null` = fechado, `"new"` = criando, objeto = editando aquela. */
  const [editing, setEditing] = useState<ReferencePin | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const spelling = useMemo(
    () => buildTagSpellingMap(pins.flatMap((pin) => pin.tags)),
    [pins]
  );

  const allTags = useMemo(
    () => [...spelling.values()].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [spelling]
  );

  const visible = useMemo(() => {
    const term = normalize(query.trim());

    return pins.filter((pin) => {
      // Tags marcadas somam em vez de estreitar: num acervo por nicho, o "e"
      // quase sempre daria mural vazio.
      if (
        activeTags.length > 0 &&
        !pin.tags.some((tag) => activeTags.includes(tagKey(tag)))
      ) {
        return false;
      }
      if (!term) return true;

      return normalize(
        [pin.title, pin.note, pinHost(pin.url), ...pin.tags].join(" ")
      ).includes(term);
    });
  }, [pins, query, activeTags]);

  function toggleTag(tag: string) {
    const key = tagKey(tag);
    setActiveTags((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  function handleDelete(pin: ReferencePin) {
    if (!window.confirm(`Excluir a referência "${pin.title || pin.url}"?`)) return;
    const formData = new FormData();
    formData.set("id", pin.id);
    startTransition(async () => {
      await deleteReferencePinAction(formData);
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
            placeholder="Buscar por nicho, título, anotação ou site..."
            aria-label="Buscar nas referências"
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

        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <PlusIcon className="size-4" />
          Adicionar referência
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
          {pins.length === 0
            ? "Nenhuma referência ainda. Use “Adicionar referência” para começar."
            : "Nenhuma referência encontrada com essa busca."}
        </p>
      ) : (
        // Mural em colunas de CSS: a altura de cada capa é a que a imagem tem,
        // sem medir nada em JavaScript nem cortar a foto num quadrado.
        <div className="columns-2 gap-3 md:columns-3 xl:columns-4 [&>*]:mb-3">
          {visible.map((pin) => {
            const host = pinHost(pin.url);
            return (
              <div
                key={pin.id}
                className={`group relative break-inside-avoid overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:border-neutral-300 ${
                  pending ? "opacity-60" : ""
                }`}
              >
                <a href={pin.url} target="_blank" rel="noopener noreferrer">
                  {/* A chave carrega a capa pra que reapontá-la recomece a
                      cadeia em vez de manter o degrau que falhou. */}
                  <PinCover key={pin.thumb_url} pin={pin} />
                </a>

                {pin.kind === "video" ? (
                  <span
                    aria-label="Vídeo"
                    className="pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-black/55 text-white"
                  >
                    <PlayIcon className="size-3 fill-current" />
                  </span>
                ) : null}

                <div className="p-3">
                  {pin.title ? (
                    <a
                      href={pin.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium text-neutral-900 hover:underline"
                    >
                      {pin.title}
                    </a>
                  ) : null}
                  {host ? (
                    <p className="truncate text-xs text-neutral-400">{host}</p>
                  ) : null}
                  {pin.note ? (
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                      {pin.note}
                    </p>
                  ) : null}

                  {pin.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pin.tags.map((tag) => {
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
                </div>

                {/* Só aparecem no hover/foco pra não competir com a imagem,
                    mas seguem no DOM e alcançáveis pelo teclado. */}
                <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditing(pin)}
                    aria-label={`Editar ${pin.title || host}`}
                    className="flex size-7 items-center justify-center rounded-md bg-white/90 text-neutral-500 hover:bg-white hover:text-neutral-900"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pin)}
                    aria-label={`Excluir ${pin.title || host}`}
                    className="flex size-7 items-center justify-center rounded-md bg-white/90 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasFilters && visible.length > 0 ? (
        <p className="mt-4 text-xs text-neutral-500">
          {visible.length} de {pins.length} referências
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
                {editing === "new" ? "Nova referência" : "Editar referência"}
              </DialogTitle>
            </DialogHeader>

            <PinForm
              pin={editing === "new" ? null : editing}
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
                form="reference-pin-form"
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
