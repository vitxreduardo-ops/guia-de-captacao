"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { updateEventAction } from "@/app/admin/agenda/actions";
import type { WeekEvent } from "@/lib/googleCalendar";

const WHEN = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

function timeText(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
}

function dayText(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  // Meio-dia UTC pra formatação não escorregar de dia por causa de fuso.
  return WHEN.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/**
 * Detalhes do compromisso, dentro do app.
 *
 * Antes o clique jogava a pessoa pro site do Google e ela perdia o contexto
 * da tela. O conteúdo é o mesmo que o Google mostraria; o link pra lá fica
 * como saída opcional, pra quem quer editar de fato.
 */
export function EventDetails({
  event,
  dayKey,
  onClose,
}: {
  event: WeekEvent | null;
  dayKey: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  // Guarda QUAL compromisso está em edição em vez de um sim/não: abrir outro
  // bloco já sai do modo edição sozinho, sem precisar de efeito pra
  // sincronizar estado com props.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    startTime: "",
    endTime: "",
  });
  // Evento repetido: o Google pergunta se a mudança vale pra um dia ou pra
  // série. Perguntar também evita mexer em semanas inteiras sem querer.
  const [scope, setScope] = useState<"single" | "series">("single");

  const editing = event !== null && editingId === event.rawId;

  /** Fechar sempre sai do modo edição: sem isso, reabrir o mesmo
   * compromisso o traria de volta no formulário, e não nos detalhes. */
  const close = useCallback(() => {
    setEditingId(null);
    setError(null);
    onClose();
  }, [onClose]);

  function startEditing(target: WeekEvent) {
    setError(null);
    setScope("single");
    setForm({
      title: target.title,
      location: target.location ?? "",
      description: (target.description ?? "").replace(/<[^>]*>/g, ""),
      startTime: timeText(target.startMinutes),
      endTime: timeText(target.endMinutes),
    });
    setEditingId(target.rawId);
  }

  useEffect(() => {
    if (!event) return;
    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [event, close]);

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, bounce: 0, duration: 0.25 };

  return (
    <AnimatePresence>
      {event ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={spring}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-label={event.title}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={spring}
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1.5 h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: event.color }}
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-medium text-neutral-900">
                  {event.title}
                </h2>
                <p className="mt-0.5 text-sm text-neutral-500 first-letter:uppercase">
                  {dayKey ? dayText(dayKey) : ""}
                  {event.allDay
                    ? " · dia todo"
                    : ` · ${timeText(event.startMinutes)} às ${timeText(
                        event.endMinutes
                      )}`}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="rounded-full px-2 text-neutral-400 transition-transform hover:bg-neutral-100 hover:text-neutral-700 active:scale-90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            {editing ? null : (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-neutral-400">Agenda</dt>
                <dd className="min-w-0 flex-1 text-neutral-700">
                  {event.calendarName}
                </dd>
              </div>

              {event.location ? (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-neutral-400">Local</dt>
                  <dd className="min-w-0 flex-1 text-neutral-700">
                    {event.location}
                  </dd>
                </div>
              ) : null}

              {event.attendees.length > 0 ? (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-neutral-400">Pessoas</dt>
                  <dd className="min-w-0 flex-1 text-neutral-700">
                    {event.attendees.join(", ")}
                  </dd>
                </div>
              ) : null}

              {event.description ? (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-neutral-400">Descrição</dt>
                  {/* A descrição do Google vem com HTML; texto puro evita
                      injetar marcação de terceiro na nossa tela. */}
                  <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-neutral-700">
                    {event.description.replace(/<[^>]*>/g, "")}
                  </dd>
                </div>
              ) : null}
            </dl>
            )}

            {editing ? (
              <form
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  setError(null);
                  startTransition(async () => {
                    const result = await updateEventAction({
                      calendarId: event.calendarId,
                      eventId: event.rawId,
                      recurringEventId: event.recurringEventId,
                      scope,
                      title: form.title,
                      location: form.location,
                      description: form.description,
                      date: dayKey,
                      startTime: event.allDay ? null : form.startTime,
                      endTime: event.allDay ? null : form.endTime,
                    });
                    if (!result.ok) {
                      setError(result.message);
                      return;
                    }
                    // A grade é renderizada no servidor: sem recarregar, o
                    // bloco continuaria com os valores antigos.
                    router.refresh();
                    close();
                  });
                }}
                className="mt-4 space-y-3"
              >
                <label className="block">
                  <span className="text-xs text-neutral-500">Título</span>
                  <input
                    value={form.title}
                    onChange={(changeEvent) =>
                      setForm((current) => ({
                        ...current,
                        title: changeEvent.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  />
                </label>

                {event.allDay ? null : (
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="text-xs text-neutral-500">Início</span>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(changeEvent) =>
                          setForm((current) => ({
                            ...current,
                            startTime: changeEvent.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="text-xs text-neutral-500">Fim</span>
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(changeEvent) =>
                          setForm((current) => ({
                            ...current,
                            endTime: changeEvent.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      />
                    </label>
                  </div>
                )}

                <label className="block">
                  <span className="text-xs text-neutral-500">Local</span>
                  <input
                    value={form.location}
                    onChange={(changeEvent) =>
                      setForm((current) => ({
                        ...current,
                        location: changeEvent.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-neutral-500">Descrição</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(changeEvent) =>
                      setForm((current) => ({
                        ...current,
                        description: changeEvent.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  />
                </label>

                {event.recurringEventId ? (
                  <fieldset className="rounded-md border border-neutral-200 p-3">
                    <legend className="px-1 text-xs text-neutral-500">
                      Este compromisso se repete
                    </legend>
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="radio"
                        name="escopo"
                        checked={scope === "single"}
                        onChange={() => setScope("single")}
                      />
                      Alterar só este dia
                    </label>
                    <label className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="radio"
                        name="escopo"
                        checked={scope === "series"}
                        onChange={() => setScope("series")}
                      />
                      Alterar todos
                    </label>
                    {scope === "series" && !event.allDay ? (
                      <p className="mt-2 text-xs text-neutral-400">
                        O horário passa a valer pra série toda; os dias em que
                        ela cai continuam os mesmos.
                      </p>
                    ) : null}
                  </fieldset>
                ) : null}

                {error ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    {error}
                  </p>
                ) : null}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-transform hover:bg-neutral-800 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    {pending ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-transform hover:bg-neutral-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {event.canEdit ? (
                <button
                  type="button"
                  onClick={() => startEditing(event)}
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-transform hover:bg-neutral-800 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Editar
                </button>
              ) : null}
              {event.meetLink ? (
                <a
                  href={event.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-transform hover:bg-neutral-800 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Entrar na chamada
                </a>
              ) : null}
              {event.htmlLink ? (
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-transform hover:bg-neutral-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {event.canEdit ? "Abrir no Google ↗" : "Editar no Google ↗"}
                </a>
              ) : null}
              {event.canEdit ? null : (
                <span className="text-xs text-neutral-400">
                  Esta agenda é só de leitura pra sua conta.
                </span>
              )}
            </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
