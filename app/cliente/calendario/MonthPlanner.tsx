"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { BACKLOG_FORMAT_LABELS, BACKLOG_FORMATS, type BacklogFormat } from "@/lib/backlogTypes";
import { calCard, calDayNumber, calDayTile, calLegendPill, calWeekday } from "@/lib/calendarStyle";
import { monthWeeks } from "@/lib/editorialMonths";
import { setPostDoneAction } from "../actions";

export interface PlannerPost {
  id: string;
  title: string;
  format: string;
  post_date: string;
  caption: string;
  client_plan: string;
  done: boolean;
  locked: boolean;
  ig_publish_at: string | null;
  guide_slug: string | null;
}

// Uma cor por formato, todas com contraste de objeto (3:1) sobre o creme.
const FORMAT_COLORS: Record<BacklogFormat, string> = {
  reel: "#2f6b4f",
  carrossel: "#9a5f12",
  card: "#7a3b6b",
  story: "#3e5c9a",
  foto: "#8a4b2d",
};
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEKDAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

const pad = (n: number) => String(n).padStart(2, "0");
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const weekday = (iso: string) => new Date(`${iso}T12:00:00`).getDay();
const formatOf = (p: PlannerPost): BacklogFormat =>
  (BACKLOG_FORMATS as readonly string[]).includes(p.format) ? (p.format as BacklogFormat) : "reel";
const label = (p: PlannerPost) => p.title || "Sem título";

/** "Gancho: texto" vira [rótulo, texto]; linha sem rótulo vira [null, texto]. */
function planRows(plan: string): [string | null, string][] {
  return plan
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      return m ? [m[1], m[2]] : [null, line];
    });
}

function Mark({ post, size = "size-3" }: { post: PlannerPost; size?: string }) {
  const color = FORMAT_COLORS[formatOf(post)];
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-[3px] border-2 ${size}`}
      style={{ borderColor: color, background: post.done ? color : "transparent" }}
    />
  );
}

/** Caixa de "feito" na cor do formato; travada quando o quadro já fechou o item. */
function DoneBox({
  post,
  onToggle,
  className = "",
}: {
  post: PlannerPost;
  onToggle: (post: PlannerPost) => void;
  className?: string;
}) {
  const color = FORMAT_COLORS[formatOf(post)];
  return (
    <label
      className={`relative grid size-11 shrink-0 cursor-pointer place-items-center has-[:disabled]:cursor-default ${className}`}
      title={post.locked ? "Concluído pela equipe" : undefined}
    >
      <input
        type="checkbox"
        checked={post.done}
        disabled={post.locked}
        onChange={() => onToggle(post)}
        aria-label={`${label(post)}: ${post.locked ? "concluído pela equipe" : "marcar como feito"}`}
        className="size-5 cursor-[inherit] appearance-none rounded-[4px] border-2 outline-offset-2"
        style={{ borderColor: color, background: post.done ? color : "transparent" }}
      />
      {post.done ? <Check aria-hidden className="pointer-events-none absolute size-3.5 text-white" strokeWidth={3.5} /> : null}
    </label>
  );
}

function publishText(iso: string) {
  return new Date(iso)
    .toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(".", "")
    .replace(",", "")
    .replace(", ", " às ");
}

/**
 * O mês como no plano de conteúdo: grade com um quadrado por publicação
 * (vazio = a fazer, cheio = feito), o detalhe do dia tocado, o progresso e a
 * lista completa. Só leitura: quem marca "feito" é a equipe, no quadro.
 */
export function MonthPlanner({
  year,
  month,
  today,
  posts: initial,
}: {
  year: number;
  month: number;
  today: string;
  posts: PlannerPost[];
}) {
  const prefix = `${year}-${pad(month)}-`;
  // Marcação otimista: mostra na hora e desfaz se o servidor recusar.
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const posts = initial.map((p) => (p.id in marks && !p.locked ? { ...p, done: marks[p.id] } : p));

  function toggle(post: PlannerPost) {
    if (post.locked) return;
    const done = !post.done;
    setError("");
    setMarks((m) => ({ ...m, [post.id]: done }));
    startTransition(async () => {
      try {
        await setPostDoneAction(post.id, done);
      } catch {
        setMarks((m) => ({ ...m, [post.id]: !done }));
        setError("Não foi possível salvar a marcação. Tente de novo.");
      }
    });
  }

  const pending = posts.filter((p) => !p.done);
  const late = pending.filter((p) => p.post_date < today);
  const next = pending.find((p) => p.post_date >= today);

  const [selected, setSelected] = useState(
    () =>
      next?.post_date ??
      late[0]?.post_date ??
      posts[0]?.post_date ??
      (today.startsWith(prefix) ? today : `${prefix}01`),
  );
  const [group, setGroup] = useState<"week" | "format">("week");
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const detailRef = useRef<HTMLDivElement>(null);

  const byDay = new Map<string, PlannerPost[]>();
  for (const p of posts) byDay.set(p.post_date, [...(byDay.get(p.post_date) ?? []), p]);
  const weeks = monthWeeks(year, month);
  const formats = BACKLOG_FORMATS.filter((f) => posts.some((p) => formatOf(p) === f));

  const summary = [
    { key: "all", title: "Tudo do mês", list: posts, color: "var(--tatu-ink)" },
    ...formats.map((f) => ({
      key: f,
      title: BACKLOG_FORMAT_LABELS[f],
      list: posts.filter((p) => formatOf(p) === f),
      color: FORMAT_COLORS[f],
    })),
  ];

  const groups =
    group === "week"
      ? weeks.map((week, i) => {
          const days = week.filter((d): d is number => d !== null);
          const from = `${prefix}${pad(days[0])}`;
          const to = `${prefix}${pad(days[days.length - 1])}`;
          return {
            title: `Semana ${i + 1} · ${dm(from)} a ${dm(to)}`,
            items: posts.filter((p) => p.post_date >= from && p.post_date <= to),
          };
        })
      : formats.map((f) => ({
          title: BACKLOG_FORMAT_LABELS[f],
          items: posts.filter((p) => formatOf(p) === f),
        }));
  const pass = (p: PlannerPost) => filter === "all" || (filter === "done" ? p.done : !p.done);

  function openDay(iso: string) {
    setSelected(iso);
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
  }

  const dayItems = byDay.get(selected) ?? [];
  const segment = (on: boolean) =>
    `min-h-10 px-3 text-sm font-semibold ${on ? "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]" : "text-[var(--tatu-muted)]"}`;

  if (!posts.length) {
    return <p className="rounded-2xl bg-white/60 px-4 py-4 text-[var(--tatu-muted)]">Nenhuma postagem programada para este mês.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Progresso */}
      {error ? (
        <p role="alert" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#a3401a]">
          {error}
        </p>
      ) : null}

      <section aria-label="Progresso do mês" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[var(--tatu-taupe)]">
        {summary.map((s) => {
          const done = s.list.filter((p) => p.done).length;
          return (
            <div key={s.key} className="space-y-1.5 bg-white/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: s.color }}>
                {s.title}
              </p>
              <p className="text-2xl font-semibold tabular-nums leading-none">
                {done} de {s.list.length}
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--tatu-taupe)]/60">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.list.length ? (done / s.list.length) * 100 : 0}%`, background: s.color }}
                />
              </div>
            </div>
          );
        })}
        <div className={`space-y-1 bg-white/80 px-4 py-3 ${summary.length % 2 ? "" : "col-span-2"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tatu-muted)]">Próximo</p>
          {next ? (
            <>
              <p className="truncate font-semibold">{label(next)}</p>
              <p className="text-sm text-[var(--tatu-muted)]">
                {WEEKDAY_NAMES[weekday(next.post_date)]}, {dm(next.post_date)}
              </p>
            </>
          ) : (
            <p className="font-semibold">{pending.length ? "Nada mais pela frente" : "Tudo feito"}</p>
          )}
          {late.length ? (
            <p className="text-sm font-semibold text-[#a3401a]">
              {late.length} {late.length === 1 ? "atrasado" : "atrasados"}
            </p>
          ) : null}
        </div>
      </section>

      {/* Grade */}
      <section aria-label="Calendário do mês" className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--tatu-muted)]">
          {formats.map((f) => (
            <span key={f} className={`${calLegendPill} bg-white text-[var(--tatu-ink)]`}>
              <span aria-hidden className="inline-block size-3 rounded-[3px] border-2" style={{ borderColor: FORMAT_COLORS[f] }} />
              {BACKLOG_FORMAT_LABELS[f]}
            </span>
          ))}
          <span>Vazio: a fazer. Cheio: feito. Marque no dia ou na lista o que já foi postado.</span>
        </div>
        <div className={`${calCard} grid grid-cols-7 gap-1 sm:gap-1.5`}>
          {WEEKDAYS.map((w) => (
            <div key={w} aria-hidden className={`pb-1 ${calWeekday}`}>
              {w}
            </div>
          ))}
          {weeks.flat().map((day, i) => {
            if (!day) return <div key={i} aria-hidden />;
            const iso = `${prefix}${pad(day)}`;
            const items = byDay.get(iso) ?? [];
            const on = iso === selected;
            const state = { today: iso === today, past: iso < today };
            const aria = `${day}, ${WEEKDAY_NAMES[weekday(iso)]}: ${
              items.length ? items.map((p) => `${label(p)} (${p.done ? "feito" : "a fazer"})`).join("; ") : "sem publicações"
            }`;
            return (
              <button
                key={i}
                type="button"
                aria-label={aria}
                aria-pressed={on}
                onClick={() => setSelected(iso)}
                className={`flex min-h-16 flex-col items-center gap-1 px-0.5 py-1.5 outline-offset-2 transition-[filter] hover:brightness-[0.97] ${calDayTile(state)} ${
                  on ? "ring-2 ring-[var(--tatu-ink)] ring-offset-2" : ""
                }`}
              >
                <span className={calDayNumber(state)}>{day}</span>
                <span className={`flex flex-wrap justify-center gap-0.5 ${state.today && items.length ? "rounded-full bg-white px-1 py-0.5" : ""}`}>
                  {items.map((p) => (
                    <Mark key={p.id} post={p} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detalhe do dia */}
        <div ref={detailRef} aria-live="polite" className="scroll-mt-4 space-y-4 rounded-2xl bg-white px-4 py-4">
          <h3 className="text-lg font-semibold first-letter:uppercase">
            {WEEKDAY_NAMES[weekday(selected)]}, {dm(selected)}
            {selected === today ? (
              <span className="ml-2 rounded-full bg-[var(--tatu-ink)] px-2 py-0.5 align-middle text-[11px] font-medium text-[var(--tatu-cream)]">
                hoje
              </span>
            ) : null}
          </h3>
          {dayItems.length ? (
            <ul className="space-y-4">
              {dayItems.map((p) => {
                const f = formatOf(p);
                return (
                  <li key={p.id} className="space-y-2 border-t border-[var(--tatu-taupe)] pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-start gap-2.5">
                      <DoneBox post={p} onToggle={toggle} className="-my-3 -ml-3" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: FORMAT_COLORS[f] }}>
                          {BACKLOG_FORMAT_LABELS[f]} ·{" "}
                          {p.done ? "feito" : p.post_date < today ? <span className="text-[#a3401a]">atrasado</span> : "a fazer"}
                        </p>
                        <p className={`font-semibold ${p.done ? "text-[var(--tatu-muted)] line-through" : ""}`}>{label(p)}</p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 pl-8 text-sm">
                      {planRows(p.client_plan).map(([k, v], n) =>
                        k ? (
                          <div key={n} className="contents">
                            <dt className="text-[var(--tatu-muted)]">{k}</dt>
                            <dd className="break-words">{v}</dd>
                          </div>
                        ) : (
                          <div key={n} className="col-span-2">
                            <dt className="sr-only">Nota</dt>
                            <dd className="break-words">{v}</dd>
                          </div>
                        ),
                      )}
                      {p.ig_publish_at ? (
                        <>
                          <dt className="text-[var(--tatu-muted)]">Instagram</dt>
                          <dd>{publishText(p.ig_publish_at)}</dd>
                        </>
                      ) : null}
                      {p.caption ? (
                        <>
                          <dt className="text-[var(--tatu-muted)]">Legenda</dt>
                          <dd className="whitespace-pre-line break-words">{p.caption}</dd>
                        </>
                      ) : null}
                      {p.guide_slug ? (
                        <>
                          <dt className="text-[var(--tatu-muted)]">Roteiro</dt>
                          <dd>
                            <Link href={`/guia/${p.guide_slug}?de=portal`} className="font-medium underline underline-offset-4">
                              Abrir roteiro
                            </Link>
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--tatu-muted)]">Nenhuma publicação neste dia.</p>
          )}
        </div>
      </section>

      {/* Checklist */}
      <section aria-labelledby="checklist" className="space-y-3">
        <h3 id="checklist" className="text-xl font-semibold">
          Tudo o que sai no mês <span className="text-base font-normal text-[var(--tatu-muted)]">({posts.length})</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Agrupar por" className="inline-flex overflow-hidden rounded-full border border-[var(--tatu-border)]">
            <button type="button" aria-pressed={group === "week"} onClick={() => setGroup("week")} className={segment(group === "week")}>
              Semana
            </button>
            <button type="button" aria-pressed={group === "format"} onClick={() => setGroup("format")} className={segment(group === "format")}>
              Formato
            </button>
          </div>
          <div role="group" aria-label="Mostrar" className="inline-flex overflow-hidden rounded-full border border-[var(--tatu-border)]">
            {(
              [
                ["all", "Todos"],
                ["todo", "A fazer"],
                ["done", "Feitos"],
              ] as const
            ).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={segment(filter === k)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {groups.some((g) => g.items.some(pass)) ? (
          groups.map((g) => {
            const visible = g.items.filter(pass);
            if (!visible.length) return null;
            return (
              <section key={g.title} className="overflow-hidden rounded-2xl bg-white/60">
                <div className="flex items-baseline justify-between gap-3 bg-white/70 px-4 py-2.5">
                  <h4 className="font-semibold">{g.title}</h4>
                  <span className="text-sm text-[var(--tatu-muted)]">
                    {g.items.filter((p) => p.done).length} de {g.items.length} feitos
                  </span>
                </div>
                <ul>
                  {visible.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 border-t border-[var(--tatu-taupe)] px-4 py-2.5">
                      <DoneBox post={p} onToggle={toggle} className="-my-2 -ml-3" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate font-medium ${p.done ? "text-[var(--tatu-muted)] line-through" : ""}`}>
                          {label(p)}
                        </span>
                        <span className="block text-sm text-[var(--tatu-muted)]">
                          {BACKLOG_FORMAT_LABELS[formatOf(p)]} · {WEEKDAYS[weekday(p.post_date)]} {dm(p.post_date)}
                          <span className="sr-only">{p.done ? ", feito" : ", a fazer"}</span>
                          {!p.done && p.post_date < today ? <span className="font-semibold text-[#a3401a]"> · atrasado</span> : null}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => openDay(p.post_date)}
                        aria-label={`Ver detalhes de ${label(p)}`}
                        className="min-h-11 shrink-0 px-2 text-sm font-medium underline underline-offset-4"
                      >
                        Detalhes
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        ) : (
          <p className="rounded-2xl bg-white/60 px-4 py-4 text-[var(--tatu-muted)]">
            {filter === "done" ? "Nenhuma publicação feita ainda." : "Tudo feito. Nada a fazer neste mês."}
          </p>
        )}
      </section>
    </div>
  );
}
