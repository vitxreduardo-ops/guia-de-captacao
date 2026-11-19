"use client";

import { useState, type ReactNode } from "react";
import { InstagramMediaPicker, type MediaState } from "@/components/admin/InstagramMediaPicker";
import { BACKLOG_FORMATS, BACKLOG_FORMAT_LABELS, type BacklogCard } from "@/lib/backlogTypes";
import { formatPublishAt, publishCountdown } from "@/lib/instagramMidia";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:bg-neutral-100";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";
const primaryButton =
  "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 pointer-coarse:min-h-11";
const ghostButton =
  "rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 pointer-coarse:min-h-11";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  publicando: "Publicando…",
  publicado: "Publicado",
  falhou: "Falhou",
};

/**
 * Aba "Publicar no Instagram" do card de entrega: formato, mídia, legenda e o
 * agendamento num lugar só. Os campos continuam dentro do mesmo <form> do
 * drawer (a aba só some da vista), então "Salvar" grava tudo.
 */
export function BacklogInstagramTab({
  card,
  account,
  format,
  onFormat,
  scheduled,
  publishAt,
  onPublishAt,
  media,
  onMedia,
  onSchedule,
  busy,
  postFields,
}: {
  card: BacklogCard;
  /** @usuario da conta conectada do cliente, se houver. */
  account: string | null;
  format: string;
  onFormat: (format: string) => void;
  scheduled: boolean;
  publishAt: string;
  onPublishAt: (value: string) => void;
  media: MediaState;
  onMedia: (state: MediaState) => void;
  /** Agenda (true) ou cancela (false) e já salva o card. */
  onSchedule: (next: boolean) => void;
  busy: boolean;
  /** Capa, tags e legenda: campos do post, definidos no drawer. */
  postFields: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const locked = card.ig_status === "publicando" || card.ig_status === "publicado";

  function schedule() {
    setError(null);
    if (media.count === 0) return setError("Adicione ao menos uma mídia para agendar.");
    if (media.problem) return setError(media.problem);
    if (!publishAt) return setError("Escolha a data e a hora da publicação.");
    // O campo é horário de Brasília (UTC-3, sem horário de verão desde 2019).
    if (new Date(`${publishAt}:00-03:00`).getTime() <= Date.now()) {
      return setError("Esse horário já passou. Escolha um futuro.");
    }
    onSchedule(true);
  }

  const savedAt = card.ig_publish_at;
  const statusLine = card.ig_status
    ? [
        STATUS_LABEL[card.ig_status],
        card.ig_status === "agendado" && savedAt
          ? `publica ${formatPublishAt(savedAt)} (${publishCountdown(savedAt)})`
          : card.ig_status === "publicado" && savedAt
            ? formatPublishAt(savedAt)
            : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-md border px-3 py-2 text-sm ${
          card.ig_status === "falhou"
            ? "border-red-200 bg-red-50 text-red-700"
            : card.ig_status === "agendado" || card.ig_status === "publicado"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-neutral-200 bg-neutral-50 text-neutral-600"
        }`}
        role="status"
      >
        {statusLine ?? "Ainda não agendado."}
        {account ? <span className="text-neutral-500"> · @{account}</span> : null}
        {card.ig_error ? <p className="mt-1 text-xs">{card.ig_error}</p> : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="backlog-ig-format">
          Formato
        </label>
        <select
          id="backlog-ig-format"
          value={format}
          onChange={(event) => onFormat(event.target.value)}
          disabled={locked}
          className={inputClass}
        >
          {BACKLOG_FORMATS.map((item) => (
            <option key={item} value={item}>
              {BACKLOG_FORMAT_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      {account ? (
        <InstagramMediaPicker
          key={card.id}
          initial={card.ig_media_urls}
          format={format}
          disabled={locked}
          onState={onMedia}
        />
      ) : card.client_id ? (
        <a
          href={`/api/instagram/oauth/start?cliente=${card.client_id}`}
          className={`${ghostButton} w-fit`}
        >
          Conectar Instagram deste cliente
        </a>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
          Escolha o cliente na aba Editar entrega e salve para publicar no Instagram dele.
        </p>
      )}

      {postFields}

      {account && !locked ? (
        <div className="sm:sticky sm:bottom-0 flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3 shadow-[0_-8px_12px_-8px_rgba(0,0,0,0.12)]">
          <label className={labelClass} htmlFor="backlog-ig-at">
            Publicar em (horário de Brasília)
          </label>
          <input
            id="backlog-ig-at"
            type="datetime-local"
            name="ig_publish_at"
            value={publishAt}
            onChange={(event) => onPublishAt(event.target.value)}
            className={inputClass}
          />
          {scheduled ? <input type="hidden" name="ig_schedule" value="on" /> : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={schedule} disabled={busy} className={primaryButton}>
              {scheduled ? "Reagendar e salvar" : "Agendar e salvar"}
            </button>
            {scheduled ? (
              <button
                type="button"
                onClick={() => onSchedule(false)}
                disabled={busy}
                className={ghostButton}
              >
                Cancelar agendamento
              </button>
            ) : null}
          </div>
          <p className="text-xs text-neutral-500">
            O sistema publica sozinho nesse horário. Agendar já salva o card.
          </p>
        </div>
      ) : null}
    </div>
  );
}
