import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProspectTabs } from "@/components/admin/ProspectTabs";
import { getProspects } from "@/lib/prospects";
import {
  daysLate,
  formatDateShort,
  formatTime,
  queueBucket,
  todayISO,
  type ProspectRow,
} from "@/lib/prospectTypes";
import { getCurrentUsername } from "@/lib/session";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "ativos", label: "Ativos" },
  { key: "atrasados", label: "Atrasados" },
  { key: "nutricao", label: "Nutrição" },
  { key: "perdidos", label: "Perdidos" },
  { key: "fechados", label: "Fechados" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matches(prospect: ProspectRow, filter: FilterKey, today: string) {
  switch (filter) {
    case "ativos":
      return prospect.stage.kind === "ativa";
    case "atrasados":
      return (
        prospect.stage.kind === "ativa" &&
        queueBucket(prospect.next_contact_date, today) !== "hoje" &&
        (queueBucket(prospect.next_contact_date, today) === "atrasado" ||
          queueBucket(prospect.next_contact_date, today) === "sem-data")
      );
    case "nutricao":
      return prospect.stage.kind === "nutricao";
    case "perdidos":
      return prospect.stage.kind === "perdida";
    case "fechados":
      return prospect.stage.kind === "ganha";
    default:
      return true;
  }
}

export default async function ProspectTablePage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const [{ filtro }, board, username] = await Promise.all([
    searchParams,
    getProspects(),
    getCurrentUsername(),
  ]);
  const today = todayISO();

  const filter = (FILTERS.find((option) => option.key === filtro)?.key ??
    "todos") as FilterKey;
  const rows = board.prospects.filter((prospect) =>
    matches(prospect, filter, today)
  );

  const counts = Object.fromEntries(
    FILTERS.map((option) => [
      option.key,
      board.prospects.filter((prospect) =>
        matches(prospect, option.key, today)
      ).length,
    ])
  ) as Record<FilterKey, number>;

  const owners = new Map(board.owners.map((owner) => [owner.id, owner.username]));
  const lost = board.prospects.filter(
    (prospect) => prospect.stage.kind === "perdida"
  );
  const won = board.prospects.filter((prospect) => prospect.stage.kind === "ganha");

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[76rem] flex-col px-4 py-10 sm:px-6">
      <AdminHeader
        title="Prospecção"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: "Tabela" },
        ]}
        username={username}
      />

      <div className="mb-4">
        <ProspectTabs active="/admin/prospeccao/tabela" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={
              option.key === "todos"
                ? "/admin/prospeccao/tabela"
                : `/admin/prospeccao/tabela?filtro=${option.key}`
            }
            aria-current={option.key === filter ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-[13px] sm:min-h-0 sm:py-1.5 sm:text-[12.5px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none ${
              option.key === filter
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {option.label} · {counts[option.key]}
          </Link>
        ))}
      </div>

      {/* No celular a tabela vira lista: oito colunas num visor de 375px só
          existem rolando de lado, e ninguém confere funil de lado. Os mesmos
          dados, na ordem em que se lê. */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((prospect) => {
          const bucket = queueBucket(prospect.next_contact_date, today);
          const late = bucket === "atrasado" || bucket === "sem-data";
          return (
            <li key={prospect.id}>
              <Link
                href={`/admin/prospeccao/${prospect.id}`}
                className={`block rounded-lg border px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none ${
                  late
                    ? "border-red-200 bg-red-50/50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[15px] font-semibold">{prospect.name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${prospect.stage.color}1a`,
                      color: prospect.stage.color,
                    }}
                  >
                    {prospect.stage.name}
                  </span>
                  <span
                    className={`ml-auto text-[13px] tabular-nums ${
                      late ? "font-semibold text-red-700" : "text-neutral-500"
                    }`}
                  >
                    {prospect.next_contact_date
                      ? `${formatDateShort(prospect.next_contact_date)}${
                          bucket === "atrasado"
                            ? ` · ${daysLate(prospect.next_contact_date, today)}d`
                            : ""
                        }`
                      : prospect.stage.kind === "ativa"
                        ? "sem data"
                        : "—"}
                  </span>
                </div>
                {prospect.contact_name || prospect.lost_reason || prospect.next_contact_what ? (
                  <p className="mt-1 text-[13px] text-neutral-600">
                    {prospect.lost_reason ||
                      prospect.next_contact_what ||
                      [prospect.contact_name, prospect.role]
                        .filter(Boolean)
                        .join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-neutral-400">
                  {[
                    prospect.origin,
                    `${prospect.touch_count} ${prospect.touch_count === 1 ? "toque" : "toques"}`,
                    owners.get(prospect.owner_id ?? "") ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="rounded-lg border border-dashed border-neutral-300 px-3 py-8 text-center text-sm text-neutral-500">
            Nada aqui com esse filtro.
          </li>
        ) : null}
      </ul>

      {/* A tabela é larga de propósito: rola dentro da própria caixa pra a
          página nunca rolar de lado. */}
      <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 sm:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-50">
              <Th>Contato</Th>
              <Th>Próximo</Th>
              <Th>Etapa</Th>
              <Th>Origem</Th>
              <Th>Último</Th>
              <Th>Toques</Th>
              <Th>Conduz</Th>
              <Th>Motivo / nota</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((prospect) => {
              const bucket = queueBucket(prospect.next_contact_date, today);
              const late = bucket === "atrasado" || bucket === "sem-data";
              return (
                <tr
                  key={prospect.id}
                  className={`border-t border-neutral-100 ${late ? "bg-red-50/40" : ""}`}
                >
                  <td className="px-3 py-2.5 align-top">
                    <Link
                      href={`/admin/prospeccao/${prospect.id}`}
                      className="font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
                    >
                      {prospect.name}
                    </Link>
                    {prospect.contact_name ? (
                      <p className="text-xs text-neutral-400">
                        {[prospect.contact_name, prospect.role]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className={`px-3 py-2.5 align-top tabular-nums whitespace-nowrap ${
                      late ? "font-semibold text-red-700" : ""
                    }`}
                  >
                    {prospect.next_contact_date ? (
                      <>
                        {formatDateShort(prospect.next_contact_date)}
                        {prospect.next_contact_time
                          ? ` · ${formatTime(prospect.next_contact_time)}`
                          : ""}
                        {bucket === "atrasado"
                          ? ` · ${daysLate(prospect.next_contact_date, today)}d`
                          : ""}
                      </>
                    ) : prospect.stage.kind === "ativa" ? (
                      "sem data"
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${prospect.stage.color}1a`,
                        color: prospect.stage.color,
                      }}
                    >
                      {prospect.stage.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-neutral-600">
                    {prospect.origin || <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 align-top tabular-nums whitespace-nowrap text-neutral-600">
                    {prospect.last_touch_at
                      ? new Date(prospect.last_touch_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top tabular-nums text-neutral-600">
                    {prospect.touch_count}
                  </td>
                  <td className="px-3 py-2.5 align-top text-neutral-600">
                    {owners.get(prospect.owner_id ?? "") ?? "—"}
                  </td>
                  <td className="max-w-56 px-3 py-2.5 align-top text-xs text-neutral-600">
                    {prospect.lost_reason || prospect.next_contact_what || ""}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">
                  Nada aqui com esse filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Os números que a tabela existe pra responder. Sem eles, ela é só uma
          lista comprida. */}
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[12.5px] text-neutral-600">
        <span>
          Fechados: <b className="text-neutral-900">{won.length}</b> de{" "}
          {won.length + lost.length} decididos
        </span>
        <span>
          Perdidos: <b className="text-neutral-900">{lost.length}</b>
          {lost.length > 0
            ? ` — ${lost.filter((row) => row.lost_reason).length} com motivo anotado`
            : ""}
        </span>
        <span>
          Sem próximo passo:{" "}
          <b className="text-neutral-900">
            {
              board.prospects.filter(
                (row) => row.stage.kind === "ativa" && !row.next_contact_date
              ).length
            }
          </b>
        </span>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-neutral-400 uppercase">
      {children}
    </th>
  );
}
