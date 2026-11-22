import Link from "next/link";
import {
  dayOfMonth,
  weekdayShort,
  type AttentionItem,
} from "@/lib/painelHojeText";
import type { Lane, WeekItem } from "@/lib/painelHoje";

const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

const CARD = "rounded-lg border border-neutral-200 bg-white p-4";

/** A cor de cada raia: preto pro cliente, o oliva da marca pra Tatu. É o
 *  único acento da tela — a cor serve pra dizer de qual quadro é, só. */
const LANE_DOT: Record<Lane, string> = {
  clientes: "bg-neutral-900",
  tatu: "bg-[var(--tatu-olive)]",
};

const LANE_LABEL: Record<Lane, string> = {
  clientes: "Clientes",
  tatu: "Tatu",
};

const LANE_HREF: Record<Lane, string> = {
  clientes: "/admin/entregas/calendario",
  tatu: "/admin/backlog/calendario",
};

export interface Stat {
  label: string;
  /** Texto já formatado, mostrado antes do JS animar. */
  display: string;
  /** Pro número contar até aqui na entrada: inteiro ou centavos. */
  count?: { kind: "int" | "brl"; value: number };
  /** Uma ou mais linhas de apoio, cada uma com o seu tom. */
  notes: { text: string; tone: "ok" | "alerta" | "neutro" }[];
  href: string;
}

const NOTE_TONE = {
  ok: "text-emerald-700",
  alerta: "text-red-700",
  neutro: "text-neutral-500",
} as const;

/** Quatro números que não somem: zero também é resposta ("em dia"). */
export function PainelStats({ stats }: { stats: Stat[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((stat) => (
        <li key={stat.label} className="min-w-0">
          <Link
            href={stat.href}
            className={`block h-full rounded-lg border border-neutral-200 bg-white p-4 transition-[background-color,transform] duration-200 ease-out hover:bg-neutral-50 active:scale-[0.985] active:duration-75 pointer-coarse:min-h-11 ${FOCUS}`}
          >
            <span className="block text-xs text-neutral-500">{stat.label}</span>
            <span
              className="mt-1 block text-2xl leading-8 font-medium tracking-tight text-neutral-900 tabular-nums"
              data-count={stat.count?.value}
              data-count-kind={stat.count?.kind}
            >
              {stat.display}
            </span>
            {stat.notes.map((note) => (
              <span
                key={note.text}
                className={`mt-0.5 block text-xs ${NOTE_TONE[note.tone]}`}
              >
                {note.text}
              </span>
            ))}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Quantas linhas a fila mostra antes de virar "e mais N". */
const ATTENTION_ROWS = 5;

const KIND_LABEL: Record<AttentionItem["kind"], string> = {
  pagamento: "Pagamento",
  "follow-up": "Follow-up",
  entrega: "Entrega",
  tarefa: "Tarefa",
};

/**
 * Tudo que passou do dia numa fila só, do mais antigo ao mais novo.
 *
 * Substitui três cartões que só existiam quando havia algo: uma fila que
 * está sempre ali, vazia ou não, ensina onde olhar — e "Tudo em dia" é uma
 * resposta tão útil quanto a lista.
 */
export function PainelAtencao({
  items,
  today,
}: {
  items: AttentionItem[];
  today: string;
}) {
  const shown = items.slice(0, ATTENTION_ROWS);
  const rest = items.length - shown.length;

  return (
    <section aria-labelledby="atencao-titulo" className={`${CARD} lg:min-h-[17rem]`}>
      <h2 id="atencao-titulo" className="mb-3 text-sm font-semibold text-neutral-900">
        Precisa de atenção
        {items.length > 0 ? (
          <span className="font-normal text-neutral-500">{` · ${items.length}`}</span>
        ) : null}
      </h2>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-neutral-900">Tudo em dia</p>
          <p className="mt-1 text-xs text-neutral-500">
            Nenhum pagamento, entrega, follow-up ou tarefa atrasada.
          </p>
        </div>
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {shown.map((item) => {
            const vencido = item.due < today;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`flex items-start gap-3 rounded-md px-2 py-1.5 transition-[background-color,transform] duration-200 ease-out hover:bg-neutral-100 active:scale-[0.99] active:duration-75 pointer-coarse:min-h-11 ${FOCUS}`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-[7px] size-1.5 shrink-0 rounded-full ${
                      vencido ? "bg-red-600" : "bg-neutral-400"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-neutral-800">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {item.detail}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs text-neutral-400">
                    {KIND_LABEL[item.kind]}
                  </span>
                </Link>
              </li>
            );
          })}
          {rest > 0 ? (
            <li className="px-2 pt-1 text-xs text-neutral-500">
              {`e mais ${rest}`}
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

/** Itens que cabem por célula; o resto vira "+N". */
const CELL_ITEMS = 2;

function WeekChip({ item }: { item: WeekItem }) {
  return (
    <Link
      href={LANE_HREF[item.lane]}
      title={[item.title, item.clientName].filter(Boolean).join(" · ")}
      className={`block truncate rounded px-1 py-0.5 text-xs leading-4 text-neutral-700 transition-colors duration-200 ease-out hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 active:duration-75 ${FOCUS}`}
    >
      {item.time ? (
        <span className="mr-1 text-neutral-400 tabular-nums">{item.time}</span>
      ) : null}
      {item.title || "Sem título"}
    </Link>
  );
}

function LaneLabel({ lane }: { lane: Lane }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-600">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${LANE_DOT[lane]}`} />
      {LANE_LABEL[lane]}
    </span>
  );
}

/**
 * Os próximos sete dias em duas raias: entregas de cliente e posts da Tatu.
 *
 * São dois quadros diferentes, então nunca dividem lista — só a mesma régua
 * de dias. No celular a régua vira uma coluna de dias (sete linhas fixas,
 * vazias ou não) e cada item leva a bolinha da sua raia.
 */
export function PainelSemana({
  days,
  items,
}: {
  days: string[];
  items: WeekItem[];
}) {
  const today = days[0];
  const byCell = (day: string, lane: Lane) =>
    items.filter((item) => item.date === day && item.lane === lane);

  return (
    <section aria-labelledby="semana-titulo" className={CARD}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="semana-titulo" className="text-sm font-semibold text-neutral-900">
          Esta semana
        </h2>
        <div className="flex gap-3 lg:hidden">
          <LaneLabel lane="clientes" />
          <LaneLabel lane="tatu" />
        </div>
      </div>

      {/* Desktop: régua de sete colunas, uma linha por raia. */}
      <div className="hidden grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] lg:grid">
        <span />
        {days.map((day) => (
          <span
            key={day}
            className={`pb-2 text-center text-xs ${
              day === today ? "font-medium text-neutral-900" : "text-neutral-500"
            }`}
          >
            {weekdayShort(day)}{" "}
            <span
              className={
                day === today
                  ? "ml-0.5 rounded-full bg-(--tatu-ink) px-1.5 py-0.5 text-white tabular-nums"
                  : "tabular-nums"
              }
            >
              {dayOfMonth(day)}
            </span>
          </span>
        ))}

        {(["clientes", "tatu"] as const).map((lane) => (
          <div key={lane} className="contents">
            <div className="flex min-h-[4.5rem] items-start border-t border-neutral-200 pt-2.5">
              <LaneLabel lane={lane} />
            </div>
            {days.map((day) => {
              const cell = byCell(day, lane);
              return (
                <div
                  key={day}
                  className={`min-h-[4.5rem] min-w-0 border-t border-neutral-200 p-1 ${
                    day === today ? "bg-neutral-50" : ""
                  }`}
                >
                  {cell.slice(0, CELL_ITEMS).map((item) => (
                    <WeekChip key={item.id} item={item} />
                  ))}
                  {cell.length > CELL_ITEMS ? (
                    <span className="block px-1 py-0.5 text-xs leading-4 text-neutral-500">
                      {`+${cell.length - CELL_ITEMS}`}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Celular: sete linhas, uma por dia. */}
      <ul className="lg:hidden">
        {days.map((day) => {
          const cell = items.filter((item) => item.date === day);
          return (
            <li
              key={day}
              className={`grid min-h-12 grid-cols-[3rem_minmax(0,1fr)] items-start gap-2 border-t border-neutral-200 py-2 ${
                day === today ? "-mx-2 rounded-md bg-neutral-50 px-2" : ""
              }`}
            >
              <span className="text-xs text-neutral-500">
                {weekdayShort(day)}
                <span
                  className={`block text-sm tabular-nums ${
                    day === today ? "font-medium text-neutral-900" : "text-neutral-700"
                  }`}
                >
                  {dayOfMonth(day)}
                </span>
              </span>
              <span className="min-w-0 space-y-0.5">
                {cell.length === 0 ? (
                  <span aria-hidden="true" className="block text-xs leading-5 text-neutral-300">
                    —
                  </span>
                ) : (
                  cell.map((item) => (
                    <Link
                      key={item.id}
                      href={LANE_HREF[item.lane]}
                      className={`flex items-center gap-2 rounded px-1 py-0.5 text-sm text-neutral-800 transition-colors duration-200 ease-out hover:bg-neutral-100 active:bg-neutral-200 active:duration-75 pointer-coarse:min-h-11 ${FOCUS}`}
                    >
                      <span
                        aria-label={LANE_LABEL[item.lane]}
                        role="img"
                        className={`size-1.5 shrink-0 rounded-full ${LANE_DOT[item.lane]}`}
                      />
                      <span className="min-w-0 truncate">
                        {item.time ? (
                          <span className="mr-1.5 text-xs text-neutral-400 tabular-nums">
                            {item.time}
                          </span>
                        ) : null}
                        {item.title || "Sem título"}
                      </span>
                    </Link>
                  ))
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
