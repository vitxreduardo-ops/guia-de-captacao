"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BACKLOG_FORMAT_LABELS,
  DEFAULT_DURATION_MINUTES,
  checklistProgress,
  type BacklogActivity,
  type BacklogCard,
  type BacklogChecklistItem,
} from "@/lib/backlogTypes";
import { createBacklogNoteAction } from "@/app/admin/backlog/actions";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="mt-0.5 text-sm text-neutral-900">{children}</div>
    </div>
  );
}

/**
 * Visualização do material: só leitura, com um botão que leva pro drawer de
 * edição. Serve pro clique no card, que antes caía direto no formulário.
 */
export function BacklogCardView({
  card,
  checklist,
  activity,
  columnName,
  columnColor,
  clientName,
  assigneeName,
  guideTitle,
  authorNameById,
  canComment,
  onClose,
  onEdit,
}: {
  card: BacklogCard;
  checklist: BacklogChecklistItem[];
  activity: BacklogActivity[];
  columnName: string;
  columnColor: string;
  clientName: string | null;
  assigneeName: string | null;
  guideTitle: string | null;
  authorNameById: Map<string, string>;
  /** Comentário só é liberado fora da primeira coluna, como no drawer. */
  canComment: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const items = checklist.filter((item) => item.card_id === card.id);
  const progress = checklistProgress(card.id, checklist);
  const history = activity.filter((item) => item.card_id === card.id);

  const [draft, setDraft] = useState("");
  // No celular a lista inteira empurra o painel; começa com as 3 últimas.
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [pending, startTransition] = useTransition();

  function addNote() {
    const message = draft.trim();
    if (!message) return;
    startTransition(async () => {
      await createBacklogNoteAction(card.id, message);
      setDraft("");
    });
  }

  const hours = Math.max(
    1,
    Math.round((card.duration_minutes ?? DEFAULT_DURATION_MINUTES) / 60)
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Centralizado, com folga nas bordas e altura limitada — o conteúdo
          rola por dentro. */}
      <DialogContent className="grid max-h-[calc(100dvh-6rem)] w-[calc(100%-3rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-5 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-base">{card.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: columnColor }}
              />
              {columnName}
            </span>
            <span aria-hidden>·</span>
            <span>{BACKLOG_FORMAT_LABELS[card.format]}</span>
            {card.approved_at ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-emerald-600">Aprovado</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {/* Duas colunas como no ClickUp: dados à esquerda, histórico e
            comentários à direita. Empilha no celular. */}
        <div className="grid min-h-0 content-start gap-5 overflow-y-auto sm:grid-cols-[1fr_20rem] sm:content-stretch sm:overflow-hidden">
          <div className="flex flex-col gap-4 sm:min-h-0 sm:overflow-y-auto sm:pr-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente">{clientName ?? "—"}</Field>
            <Field label="Responsável">
              {assigneeName ? `@${assigneeName}` : "—"}
            </Field>
            <Field label="Data de post">
              {card.post_date ? formatDate(card.post_date) : "Sem data"}
            </Field>
            <Field label="Horário">
              {card.post_time
                ? `${card.post_time.slice(0, 5)} · ${hours}h`
                : "Sem horário"}
            </Field>
          </div>

          <Field label="Onde foi feito o backup">
            {card.backup_location ?? "—"}
          </Field>

          <Field label="Guia de captação">{guideTitle ?? "—"}</Field>

          <Field label="Link do Drive">
            {card.drive_url ? (
              <a
                href={card.drive_url}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-700 underline hover:text-neutral-900"
              >
                Abrir no Drive ↗
              </a>
            ) : (
              "—"
            )}
          </Field>

          <Field label="Enviado por WhatsApp">
            {card.sent_whatsapp ? "Sim" : "Não"}
          </Field>

          {card.tags.length > 0 ? (
            <Field label="Tags">
              {card.tags.map((tag) => `#${tag}`).join(" ")}
            </Field>
          ) : null}

          {card.caption ? (
            <Field label="Legenda do post">
              <p className="whitespace-pre-wrap">{card.caption}</p>
            </Field>
          ) : null}

          {card.description ? (
            <Field label="Observações internas">
              <p className="whitespace-pre-wrap">{card.description}</p>
            </Field>
          ) : null}

          <div>
            <p className="text-xs font-medium text-neutral-500">
              Checklist{progress ? ` · ${progress.done}/${progress.total}` : ""}
            </p>
            {items.length === 0 ? (
              <p className="mt-0.5 text-sm text-neutral-500">Sem tarefas.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`text-sm ${
                      item.done
                        ? "text-neutral-400 line-through"
                        : "text-neutral-800"
                    }`}
                  >
                    {item.done ? "☑" : "☐"} {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          </div>

          {/* Coluna da direita: histórico e comentários. */}
          <div className="flex flex-col gap-2 border-neutral-200 sm:min-h-0 sm:overflow-y-auto sm:border-l sm:pl-5">
            <p className="text-xs font-medium text-neutral-500">
              Atividade e comentários
            </p>

            {canComment ? (
              <div className="flex gap-1">
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
                  className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={addNote}
                  disabled={pending}
                  aria-label="Adicionar comentário"
                  className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Comentário fica liberado a partir de Captado.
              </p>
            )}

            {history.length === 0 ? (
              <p className="text-sm text-neutral-500">Nada registrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {history.map((item, index) => (
                  <li
                    key={item.id}
                    className={`text-xs text-neutral-700 ${
                      index >= 3 && !showAllActivity ? "hidden sm:list-item" : ""
                    }`}
                  >
                    <span
                      className={
                        item.kind === "note"
                          ? "text-neutral-900"
                          : "text-neutral-600"
                      }
                    >
                      {item.kind === "answer"
                        ? "🗄 "
                        : item.kind === "move"
                          ? "↪ "
                          : "💬 "}
                      {item.message}
                    </span>
                    <span className="ml-1 text-neutral-400">
                      {item.author_id
                        ? `${authorNameById.get(item.author_id) ?? "alguém"} · `
                        : ""}
                      {formatDateTime(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Só no celular: no desktop a coluna já rola por dentro. */}
            {history.length > 3 && !showAllActivity ? (
              <button
                type="button"
                onClick={() => setShowAllActivity(true)}
                className="self-start text-xs text-neutral-500 underline hover:text-neutral-900 sm:hidden"
              >
                Ver mais {history.length - 3} registros
              </button>
            ) : null}
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Editar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
