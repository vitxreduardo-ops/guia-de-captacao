import Link from "next/link";
import { BACKLOG_FORMAT_LABELS } from "@/lib/backlogTypes";
import {
  UPCOMING_DAYS_AHEAD,
  isoDayFromToday,
  type UpcomingPost,
} from "@/lib/upcomingPosts";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** "2026-08-20" -> "Hoje", "Amanhã" ou "Qui 20/08", sem passar por fuso. */
function dayLabel(iso: string) {
  if (iso === isoDayFromToday()) return "Hoje";
  if (iso === isoDayFromToday(1)) return "Amanhã";
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${pad(day)}/${pad(month)}`;
}

export function UpcomingPosts({ posts }: { posts: UpcomingPost[] }) {
  // Já vêm ordenados por data e hora, então basta agrupar em sequência.
  const days = posts.reduce<{ iso: string; posts: UpcomingPost[] }[]>(
    (groups, post) => {
      const last = groups.at(-1);
      if (last?.iso === post.post_date) last.posts.push(post);
      else groups.push({ iso: post.post_date, posts: [post] });
      return groups;
    },
    []
  );

  return (
    <section
      aria-labelledby="proximas-titulo"
      className="rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2
          id="proximas-titulo"
          className="text-sm font-semibold text-neutral-900"
        >
          Próximas postagens
          {posts.length > 0 ? (
            <span className="font-normal text-neutral-500">
              {` · ${posts.length}`}
            </span>
          ) : null}
        </h2>
        <Link
          href="/admin/backlog/calendario"
          className="shrink-0 rounded text-xs text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Calendário
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Nada agendado nos próximos {UPCOMING_DAYS_AHEAD} dias.
        </p>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day.iso}>
              <p className="mb-1 text-xs font-semibold text-neutral-500">
                {dayLabel(day.iso)}
              </p>
              {/* -mx-2 puxa o padding do link pra fora: sem isso a linha
                  começava 8px à direita do título e do rótulo do dia, e
                  desalinhava do bloco de atalhos logo acima. */}
              <ul className="-mx-2 space-y-0.5">
                {day.posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href="/admin/backlog"
                      className="block rounded-md px-2 py-1.5 text-sm transition-transform hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] pointer-coarse:min-h-11"
                    >
                      <span className="block break-words text-neutral-800">
                        {post.title || "Sem título"}
                      </span>
                      {/* Horário vive aqui, não numa coluna fixa à esquerda:
                          material sem hora marcada é comum, e a coluna exigia
                          um traço de preenchimento que não dizia nada. */}
                      <span className="text-xs text-neutral-500">
                        {[
                          post.post_time?.slice(0, 5),
                          BACKLOG_FORMAT_LABELS[post.format],
                          post.client_name,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
