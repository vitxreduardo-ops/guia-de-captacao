"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createEventAction } from "@/app/admin/agenda/actions";
import type { CalendarSource } from "@/lib/googleCalendar";

const WHEN = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

function dayText(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  // Meio-dia UTC pra formatação não escorregar de dia por causa de fuso.
  return WHEN.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export interface NewEventSlot {
  dayKey: string;
  /** HH:MM já encaixados no passo da grade. */
  startTime: string;
  endTime: string;
}

/**
 * Criação de compromisso a partir de um horário vazio da grade.
 *
 * O clique já define dia e horário; o formulário só completa o resto. As
 * agendas oferecidas são as que a conta pode escrever — as de leitura
 * devolveriam 403 depois da pessoa ter digitado tudo.
 */
export function EventCreate({
  slot,
  calendars,
  onClose,
}: {
  slot: NewEventSlot | null;
  calendars: CalendarSource[];
  onClose: () => void;
}) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    calendarId: "",
    startTime: "",
    endTime: "",
  });

  // Cada horário clicado abre um formulário novo: sem isso o título anterior
  // ficaria pendurado no próximo compromisso. O reset é feito no próprio
  // render (e não num efeito) pra não haver um quadro com os dados antigos.
  const slotId = slot ? `${slot.dayKey}T${slot.startTime}` : null;
  const [formSlotId, setFormSlotId] = useState<string | null>(null);
  if (slot && formSlotId !== slotId) {
    setFormSlotId(slotId);
    setError(null);
    setForm({
      title: "",
      location: "",
      description: "",
      calendarId: calendars[0]?.id ?? "",
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  useEffect(() => {
    if (!slot) return;
    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slot, onClose]);

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, bounce: 0, duration: 0.25 };

  return (
    <AnimatePresence>
      {slot ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={spring}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Novo compromisso"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={spring}
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-medium text-neutral-900">
                  Novo compromisso
                </h2>
                <p className="mt-0.5 text-sm text-neutral-500 first-letter:uppercase">
                  {dayText(slot.dayKey)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-full px-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            {calendars.length === 0 ? (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                Nenhuma das suas agendas aceita escrita — não dá pra criar
                compromissos por aqui.
              </p>
            ) : (
              <form
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  setError(null);
                  startTransition(async () => {
                    const result = await createEventAction({
                      calendarId: form.calendarId,
                      title: form.title,
                      location: form.location,
                      description: form.description,
                      date: slot.dayKey,
                      startTime: form.startTime,
                      endTime: form.endTime,
                    });
                    if (!result.ok) {
                      setError(result.message);
                      return;
                    }
                    // A grade vem do servidor: sem recarregar, o compromisso
                    // recém-criado não apareceria.
                    router.refresh();
                    onClose();
                  });
                }}
                className="mt-4 space-y-3"
              >
                <label className="block">
                  <span className="text-xs text-neutral-500">Título</span>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={(changeEvent) =>
                      setForm((current) => ({
                        ...current,
                        title: changeEvent.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                </label>

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
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
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
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-neutral-500">Agenda</span>
                  <select
                    value={form.calendarId}
                    onChange={(changeEvent) =>
                      setForm((current) => ({
                        ...current,
                        calendarId: changeEvent.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                  >
                    {calendars.map((calendar) => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.name}
                      </option>
                    ))}
                  </select>
                </label>

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
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
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
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                </label>

                {error ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    {error}
                  </p>
                ) : null}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {pending ? "Criando..." : "Criar"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onClose}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
