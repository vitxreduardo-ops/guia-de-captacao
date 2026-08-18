"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  BACKLOG_FORMATS,
  BACKLOG_FORMAT_LABELS,
  type BacklogCard,
  type BacklogActivity,
  type BacklogChecklistItem,
  type BacklogClientOption,
  type BacklogGuideOption,
  type BacklogUserOption,
} from "@/lib/backlogTypes";
import {
  createBacklogChecklistItemAction,
  createBacklogNoteAction,
  deleteBacklogChecklistItemAction,
  setBacklogChecklistItemDoneAction,
} from "@/app/admin/backlog/actions";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

/**
 * Checklist do material. Fica fora do `form` principal do drawer — cada item
 * grava na hora, e `form` dentro de `form` é HTML inválido.
 */
function ChecklistSection({
  cardId,
  items,
}: {
  cardId: string;
  items: BacklogChecklistItem[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  const done = items.filter((item) => item.done).length;

  function addItem() {
    const label = draft.trim();
    if (!label) return;
    startTransition(async () => {
      await createBacklogChecklistItemAction(cardId, label);
      setDraft("");
      inputRef.current?.focus();
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className={labelClass + " mb-0"}>Checklist</p>
        {items.length > 0 ? (
          <span className="text-xs text-neutral-500">
            {done}/{items.length}
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="mb-2 flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1.5"
            >
              <input
                type="checkbox"
                checked={item.done}
                disabled={pending}
                onChange={(event) => {
                  const next = event.target.checked;
                  startTransition(() =>
                    setBacklogChecklistItemDoneAction(item.id, next)
                  );
                }}
                className="h-4 w-4 shrink-0"
              />
              <span
                className={`flex-1 text-sm ${
                  item.done
                    ? "text-neutral-400 line-through"
                    : "text-neutral-800"
                }`}
              >
                {item.label}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    deleteBacklogChecklistItemAction(item.id)
                  )
                }
                aria-label={`Excluir "${item.label}"`}
                className="shrink-0 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-neutral-500">
          Nenhuma tarefa ainda. Ex: roteirizar, captar, editar, agendar.
        </p>
      )}

      <div className="flex gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // O drawer inteiro é um form: sem isso, Enter salvaria o card.
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Nova tarefa"
          disabled={pending}
          className={inputClass}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={pending}
          aria-label="Adicionar tarefa"
          className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}

function formatActivityDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Histórico do material: movimentações, respostas de automação e comentários.
 * Fica fora do `form` principal pelo mesmo motivo do checklist.
 */
function ActivitySection({
  cardId,
  items,
  authorNameById,
  canComment,
}: {
  cardId: string;
  items: BacklogActivity[];
  authorNameById: Map<string, string>;
  canComment: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function addNote() {
    const message = draft.trim();
    if (!message) return;
    startTransition(async () => {
      await createBacklogNoteAction(cardId, message);
      setDraft("");
    });
  }

  return (
    <div>
      <p className={labelClass}>Atividade</p>

      {canComment ? (
        <div className="mb-2 flex gap-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addNote();
              }
            }}
            placeholder="Escrever um comentário"
            disabled={pending}
            className={inputClass}
          />
          <button
            type="button"
            onClick={addNote}
            disabled={pending}
            aria-label="Adicionar comentário"
            className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            +
          </button>
        </div>
      ) : (
        <p className="mb-2 text-xs text-neutral-500">
          Comentário fica liberado a partir de Captado.
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-neutral-500">Nada registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id} className="text-xs text-neutral-700">
              <span
                className={
                  item.kind === "note" ? "text-neutral-900" : "text-neutral-600"
                }
              >
                {item.kind === "answer" ? "🗄 " : item.kind === "move" ? "↪ " : "💬 "}
                {item.message}
              </span>
              <span className="ml-1 text-neutral-400">
                {item.author_id
                  ? `${authorNameById.get(item.author_id) ?? "alguém"} · `
                  : ""}
                {formatActivityDate(item.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BacklogCardDrawer({
  card,
  checklist,
  activity,
  isFirstColumn,
  clients,
  guides,
  users,
  onClose,
  onSave,
  onDelete,
}: {
  card: BacklogCard;
  checklist: BacklogChecklistItem[];
  activity: BacklogActivity[];
  /** Na primeira coluna o material ainda é ideia — comentário só depois. */
  isFirstColumn: boolean;
  clients: BacklogClientOption[];
  guides: BacklogGuideOption[];
  users: BacklogUserOption[];
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await onSave(formData);
      onClose();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Excluir "${card.title}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(async () => {
      await onDelete(card.id);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40"
      />

      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <p className="text-sm font-semibold text-neutral-900">Editar material</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 p-4">
          <input type="hidden" name="id" value={card.id} />

          <div>
            <label className={labelClass} htmlFor="backlog-title">
              Título
            </label>
            <input
              id="backlog-title"
              name="title"
              defaultValue={card.title}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="backlog-format">
                Formato
              </label>
              <select
                id="backlog-format"
                name="format"
                defaultValue={card.format}
                className={inputClass}
              >
                {BACKLOG_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {BACKLOG_FORMAT_LABELS[format]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="backlog-post-date">
                Data de post
              </label>
              <input
                id="backlog-post-date"
                type="date"
                name="post_date"
                defaultValue={card.post_date ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="backlog-post-time">
                Horário
              </label>
              <input
                id="backlog-post-time"
                type="time"
                name="post_time"
                defaultValue={card.post_time?.slice(0, 5) ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="backlog-assignee">
              Responsável
            </label>
            <select
              id="backlog-assignee"
              name="assignee_id"
              defaultValue={card.assignee_id ?? "none"}
              className={inputClass}
            >
              <option value="none">Sem responsável</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="backlog-client">
              Cliente
            </label>
            <select
              id="backlog-client"
              name="client_id"
              defaultValue={card.client_id ?? "none"}
              className={inputClass}
            >
              <option value="none">Sem cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="backlog-guide">
              Guia de captação
            </label>
            <select
              id="backlog-guide"
              name="guide_id"
              defaultValue={card.guide_id ?? "none"}
              className={inputClass}
            >
              <option value="none">Sem guia</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="backlog-drive">
              Link do Drive
            </label>
            <input
              id="backlog-drive"
              name="drive_url"
              defaultValue={card.drive_url ?? ""}
              placeholder="drive.google.com/..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="backlog-cover">
              Capa (link de imagem, opcional)
            </label>
            <input
              id="backlog-cover"
              name="cover_url"
              defaultValue={card.cover_url ?? ""}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <ChecklistSection
            cardId={card.id}
            items={checklist.filter((item) => item.card_id === card.id)}
          />

          <label className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="sent_whatsapp"
              defaultChecked={card.sent_whatsapp}
              className="h-4 w-4"
            />
            Enviado por WhatsApp
          </label>

          <div>
            <label className={labelClass} htmlFor="backlog-tags">
              Tags (separadas por vírgula)
            </label>
            <input
              id="backlog-tags"
              name="tags"
              defaultValue={card.tags.join(", ")}
              placeholder="natal, bastidor, promo"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="backlog-caption">
              Legenda do post
            </label>
            <textarea
              id="backlog-caption"
              name="caption"
              defaultValue={card.caption}
              rows={4}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="backlog-description">
              Observações internas
            </label>
            <textarea
              id="backlog-description"
              name="description"
              defaultValue={card.description}
              rows={3}
              className={inputClass}
            />
          </div>

          <ActivitySection
            cardId={card.id}
            items={activity.filter((item) => item.card_id === card.id)}
            authorNameById={
              new Map(users.map((user) => [user.id, user.username]))
            }
            canComment={!isFirstColumn}
          />

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Excluir
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
