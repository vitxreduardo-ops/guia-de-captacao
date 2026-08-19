"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/admin/notificacoes/actions";
import type { Notification } from "@/lib/notificationTypes";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

/** "há 3 min", "há 2 h", "há 4 d" — precisão de relógio aqui não ajuda. */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Clique fora e Esc fecham: um dropdown que só fecha no próprio botão prende
  // quem já moveu o mouse pra outro lugar.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      // Fechar sem devolver o foco deixaria quem usa teclado perdido no fim
      // da página, então o Esc volta pro próprio sino.
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // A lista é buscada no servidor; ao abrir, pede o estado atual pra quem
    // deixou a aba parada não ver uma campainha velha.
    if (next) router.refresh();
  }

  function handleItemClick(id: string, read: boolean) {
    // Fecha na hora: o item leva pra outra tela, e um dropdown que sobrevive à
    // navegação reaparece aberto no destino.
    setOpen(false);
    if (read) return;
    startTransition(() => markNotificationReadAction(id));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? `Notificações (${unreadCount} não lidas)`
            : "Notificações"
        }
        // O sino fica no mesmo preto e branco do resto do header; o vermelho
        // é só do contador, que é a única parte que precisa saltar.
        className={`relative flex items-center rounded-md border border-neutral-300 px-2.5 py-1.5 text-neutral-600 transition-transform hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.97] pointer-coarse:min-h-11 ${FOCUS_RING}`}
      >
        <Bell aria-hidden="true" className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
            <span className="text-sm font-semibold text-neutral-900">
              Notificações
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(() => markAllNotificationsReadAction())
                }
                className={`rounded px-1 text-xs text-neutral-500 hover:text-neutral-900 ${FOCUS_RING}`}
              >
                Marcar tudo como lido
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">
              Nada por aqui ainda.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
              {notifications.map((item) => {
                const read = Boolean(item.read_at);
                const content = (
                  <span className="flex items-start gap-2">
                    {/* Ponto só no não lido: é o que diferencia à distância. */}
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        read ? "bg-transparent" : "bg-neutral-900"
                      }`}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-sm ${
                          read
                            ? "text-neutral-600"
                            : "font-medium text-neutral-900"
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.body ? (
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          {item.body}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[11px] text-neutral-400">
                        {timeAgo(item.created_at)}
                      </span>
                    </span>
                  </span>
                );

                return (
                  <li key={item.id}>
                    {item.link ? (
                      <Link
                        href={item.link}
                        role="menuitem"
                        onClick={() => handleItemClick(item.id, read)}
                        className={`block px-3 py-2.5 hover:bg-neutral-50 ${FOCUS_RING}`}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemClick(item.id, read)}
                        className={`block w-full px-3 py-2.5 text-left hover:bg-neutral-50 ${FOCUS_RING}`}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
