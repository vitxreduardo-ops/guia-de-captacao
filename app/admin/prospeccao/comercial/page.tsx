import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProspectTabs } from "@/components/admin/ProspectTabs";
import { getProspects } from "@/lib/prospects";
import {
  conversionRate,
  currentMonth,
  formatBRL,
  lostReasons,
  missingValue,
  openPipeline,
  totalsByStage,
  wonInMonth,
} from "@/lib/prospectPipeline";

export const dynamic = "force-dynamic";

/**
 * O funil visto pelo lado do dinheiro.
 *
 * A fila responde "com quem eu falo hoje"; esta tela responde "quanto há em
 * jogo, quanto fechou e por que não fecha". São os mesmos contatos — por isso
 * é aba de Prospecção, e não um módulo à parte que pediria um segundo cadastro
 * das mesmas empresas.
 */
export default async function CommercialPage() {
  const board = await getProspects();
  const mes = currentMonth();

  const aberto = openPipeline(board.prospects);
  const ganho = wonInMonth(board.prospects, mes);
  const taxa = conversionRate(board.prospects);
  const etapas = totalsByStage(board.prospects, board.stages);
  const motivos = lostReasons(board.prospects);
  const semValor = missingValue(board.prospects);

  // A barra é proporcional à maior etapa, não ao total: com a escala no
  // total, um funil saudável (muita coisa no topo) vira cinco tracinhos.
  const maior = Math.max(1, ...etapas.map((etapa) => etapa.value));

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <AdminHeader
        title="Comercial"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: "Comercial" },
        ]}
      />

      <div className="mb-6">
        <ProspectTabs active="/admin/prospeccao/comercial" />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Numero
          rotulo="Em jogo agora"
          valor={formatBRL(aberto.value)}
          detalhe={`${aberto.count} ${aberto.count === 1 ? "contato" : "contatos"} em andamento`}
        />
        <Numero
          rotulo="Fechado neste mês"
          valor={formatBRL(ganho.value)}
          detalhe={`${ganho.count} ${ganho.count === 1 ? "fechamento" : "fechamentos"}`}
        />
        <Numero
          rotulo="Conversão"
          valor={taxa === null ? "—" : `${Math.round(taxa * 100)}%`}
          detalhe={
            taxa === null
              ? "Nada decidido ainda"
              : "Do que foi decidido, ganho ou perdido"
          }
        />
      </div>

      <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Onde o dinheiro está parado
        </h2>
        <ul className="space-y-2.5">
          {etapas.map(({ stage, count, value }) => (
            <li key={stage.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-neutral-700">{stage.name}</span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {count} · {formatBRL(value)}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 rounded-full bg-neutral-100"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((value / maior) * 100)}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Por que não fecha
          </h2>
          {motivos.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nenhum motivo registrado ainda. Ele é pedido quando o contato vai
              pra etapa de perda.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {motivos.map((motivo) => (
                <li
                  key={motivo.reason}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="min-w-0 break-words text-neutral-700">
                    {motivo.reason}
                  </span>
                  <span className="shrink-0 tabular-nums text-neutral-500">
                    {motivo.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sem este bloco o "em jogo" de cima é sempre um número mentindo pra
            baixo, e não dá pra saber de quanto. */}
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Ainda sem valor
          </h2>
          {semValor.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Todo contato em andamento tem valor. O número acima está inteiro.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {semValor.map((prospect) => (
                <li key={prospect.id}>
                  <Link
                    href={`/admin/prospeccao/${prospect.id}`}
                    className="text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
                  >
                    {prospect.name}
                  </Link>
                  <span className="ml-2 text-neutral-400">
                    {prospect.stage.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
        {rotulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500">{detalhe}</p>
    </div>
  );
}
