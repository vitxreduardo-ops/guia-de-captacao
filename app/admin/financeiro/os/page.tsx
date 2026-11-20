import Link from "next/link";
import { backlogBoardPath, findCardByProtocol } from "@/lib/backlog";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { formatProtocol, parseProtocol } from "@/lib/protocol";

export const dynamic = "force-dynamic";

export default async function ProtocoloPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const protocol = parseProtocol(q);
  const found = protocol ? await findCardByProtocol(protocol, await getCurrentClientScope()) : null;

  return (
    <div className="max-w-2xl">
      <form className="flex gap-2" action="/admin/financeiro/os">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          inputMode="numeric"
          placeholder="0042 0017"
          aria-label="Protocolo da OS"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
        />
        <button className="rounded-md bg-(--tatu-ink) px-4 py-2 text-sm text-white">Buscar</button>
      </form>

      {q && !protocol ? (
        <p className="mt-4 text-sm text-neutral-600">O protocolo tem 8 dígitos, como 0042 0017.</p>
      ) : null}
      {q && protocol && !found ? (
        <p className="mt-4 text-sm text-neutral-600">Nenhuma OS com o protocolo {formatProtocol(protocol)}.</p>
      ) : null}
      {found ? (
        <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-y-1.5 rounded-lg border border-neutral-200 p-4 text-sm">
          <dt className="text-neutral-500">OS</dt>
          <dd className="font-mono">{formatProtocol(found.card.protocol_code)}</dd>
          <dt className="text-neutral-500">Tarefa</dt>
          <dd className="font-medium">{found.card.title}</dd>
          <dt className="text-neutral-500">Cliente</dt>
          <dd>
            {found.clientName ?? "Tatu (interna)"}
            {found.card.protocol_code.slice(0, 4) !== "0000" && !found.clientName ? " (cliente removido)" : ""}
          </dd>
          <dt className="text-neutral-500">Responsável</dt>
          <dd>{found.assigneeNames.join(", ") || "Sem responsável"}</dd>
          <dt className="text-neutral-500">Prazo</dt>
          <dd>{found.card.post_date ? found.card.post_date.split("-").reverse().join("/") : "Sem prazo"}</dd>
          <dt className="text-neutral-500">Status</dt>
          <dd>{found.columnName}</dd>
          <dd className="col-span-2 mt-2">
            <Link className="underline" href={backlogBoardPath(found.board)}>
              Abrir no quadro
            </Link>
          </dd>
        </dl>
      ) : null}
    </div>
  );
}
