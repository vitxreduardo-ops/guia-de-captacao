import Link from "next/link";
import { EditarValor } from "@/components/admin/financeiro/Acoes";
import { FazerAgora } from "@/components/admin/financeiro/FazerAgora";
import { Ancora, Anel, CARTAO, Dado, Dinheiro, Vazio } from "@/components/admin/financeiro/ui";
import { getCaixa, getResultadoAno } from "@/lib/caixa";
import { formatBRL, monthKey } from "@/lib/billingTypes";
import { getMoneyMonth } from "@/lib/dinheiro";
import { getClientCosts } from "@/lib/expenses";
import { saveRevenueGoalAction, saveReserveRateAction } from "../caixa";
import { FOCO, MES_CURTO, SetaMes, href, lerParametros, shiftMonth } from "../_comum";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { scope, month, thisMonth, nome, mesNome, year } = await lerParametros(searchParams);
  if (scope !== null) {
    return <Vazio>A análise do estúdio só aparece para quem tem acesso a todos os clientes.</Vazio>;
  }
  const [c, ano, dadosMes, custos] = await Promise.all([
    getCaixa(),
    getResultadoAno(year),
    getMoneyMonth(month, null),
    getClientCosts(month),
  ]);
  const taxa = c.settings.reserveRateBps;
  const reservaDe = (v: number) => Math.round((v * taxa) / 10_000);
  const sobrouMes = ano.entrou.map((e, i) => e - ano.saiu[i] - reservaDe(e));
  const i = Number(month.slice(5, 7)) - 1;
  const entrou = ano.entrou[i];
  const saiu = ano.saiu[i];
  const sobrou = sobrouMes[i];
  const meta = c.settings.revenueGoalCents;
  const pctMeta = meta ? Math.max(0, Math.round((entrou / meta) * 100)) : 0;
  const totalAno = sobrouMes.reduce((s, v) => s + v, 0);
  const reservaAno = ano.entrou.reduce((s, e) => s + reservaDe(e), 0);
  const taxaTexto = String(taxa / 100).replace(".", ",");

  // Margem por cliente: o que o cliente rendeu no mês menos o que se gastou só com ele.
  const clientes = dadosMes.clients
    .map((cl) => {
      const rendeu = cl.paidCents + cl.openCents;
      const gastou = custos[cl.id] ?? 0;
      return { id: cl.id, name: cl.name, rendeu, gastou, margem: rendeu > 0 ? Math.round(((rendeu - gastou) / rendeu) * 100) : 0 };
    })
    .filter((cl) => cl.rendeu > 0 || cl.gastou > 0)
    .sort((a, b) => b.rendeu - a.rendeu);

  const topo = Math.max(0, ...sobrouMes);
  const fundo = Math.min(0, ...sobrouMes);
  const faixa = Math.max(1, topo - fundo);
  const zero = (topo / faixa) * 100;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SetaMes href={href("analise", shiftMonth(month, -1))} lado="anterior" />
        <div className="text-center">
          <h2 className="text-xl font-medium text-neutral-900 first-letter:uppercase">{nome}</h2>
          <p className="min-h-6 text-base text-neutral-600">
            {month !== thisMonth ? <Link href={href("analise")} className="underline">Voltar para este mês</Link> : null}
          </p>
        </div>
        <SetaMes href={href("analise", shiftMonth(month, 1))} lado="proximo" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <Ancora label="Meta de faturamento" className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          {/* O mês já está no título da página: aqui fica só o nome da meta. */}
          <h2 className="text-base font-medium">Meta de faturamento</h2>
          {meta ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <Anel pct={pctMeta} rotulo={`Meta de faturamento de ${mesNome(month)}`} />
              <div>
                <p className="text-lg font-medium tabular-nums">
                  {formatBRL(entrou)} <span className="font-normal text-(--tatu-cream)/75">de {formatBRL(meta)}</span>
                </p>
                <p className="text-sm text-(--tatu-cream)/75">
                  {entrou >= meta ? "Meta batida" : `Faltam ${formatBRL(meta - entrou)}`}
                </p>
              </div>
            </div>
          ) : (
            <p className="flex-1 text-base text-(--tatu-cream)/85">
              Defina quanto o estúdio quer faturar por mês para acompanhar aqui.
            </p>
          )}
          <div className="[&>button]:w-full">
            <EditarValor
              rotulo={meta ? "Mudar meta" : "Definir meta"}
              titulo="Meta de faturamento do mês"
              dica="Quanto o estúdio quer faturar por mês, contando o que entra no caixa. Vazio apaga a meta."
              action={saveRevenueGoalAction}
              valorInicial={meta ? (meta / 100).toFixed(2).replace(".", ",") : ""}
              placeholder="R$ 0,00"
              variante="claro"
            />
          </div>
        </Ancora>

        <FazerAgora receber={c.receber} pagar={c.pagar} hoje={c.hoje} className="lg:col-span-2 lg:col-start-1 lg:row-start-2" />

        <section className={`${CARTAO} lg:col-start-3 lg:row-start-1`}>
          <h2 className="text-sm text-neutral-600">Reserva estimada</h2>
          <Dinheiro cents={reservaDe(entrou)} className="text-2xl" centavos={false} />
          <p className="text-sm text-neutral-500">{taxaTexto}% sobre o que entrou em {mesNome(month)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Dado label="Entrou no mês" cents={entrou} />
            <Dado label={`Acumulado em ${year}`} cents={reservaAno} />
          </div>
          <div className="mt-3">
            <EditarValor
              rotulo="Mudar % de reserva"
              titulo="% de reserva estimada"
              dica="Quanto de tudo que entra o estúdio separa como reserva (por enquanto não há imposto a pagar)."
              action={saveReserveRateAction}
              valorInicial={taxaTexto}
              sufixo="%"
            />
          </div>
        </section>

        <section className={`${CARTAO} lg:col-start-2 lg:row-start-1`}>
          <h2 className="text-lg font-medium text-neutral-900 first-letter:uppercase">Resultado de {mesNome(month)}</h2>
          <p className="mb-3 text-sm text-neutral-500">Pelo dia do pagamento. Saiu conta também o que ainda vai pagar no mês.</p>
          <dl className="divide-y divide-neutral-100 text-base">
            {[
              ["Entrou", entrou, "+"],
              ["Saiu", saiu, "−"],
              ["Reserva estimada", reservaDe(entrou), "−"],
            ].map(([rotulo, valor, sinal]) => (
              <div key={rotulo as string} className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-neutral-600">{rotulo}</dt>
                <dd className="tabular-nums text-neutral-900">{sinal} {formatBRL(valor as number)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="font-medium text-neutral-900">Sobrou</dt>
              <dd className={`text-xl font-medium tabular-nums ${sobrou < 0 ? "text-red-700" : "text-(--tatu-ink)"}`}>{formatBRL(sobrou)}</dd>
            </div>
          </dl>
          <p className="text-sm text-neutral-500">
            {entrou > 0 ? `Margem de lucro de ${Math.round((sobrou / entrou) * 100)}%` : "Sem entradas neste mês"}
          </p>
        </section>

        <section className={`${CARTAO} lg:col-start-3 lg:row-start-2`}>
          <h2 className="text-lg font-medium text-neutral-900">Quanto sobrou em {year}</h2>
          <p className="mb-3 text-sm text-neutral-500">Total do ano: {formatBRL(totalAno)}. Toque num mês para abrir.</p>
          <ol className="grid grid-cols-12 gap-1">
            {sobrouMes.map((v, idx) => {
              const key = `${year}-${String(idx + 1).padStart(2, "0")}-01`;
              const atual = key === monthKey(month);
              const h = (Math.abs(v) / faixa) * 100;
              return (
                <li key={key}>
                  <Link
                    href={href("analise", key)}
                    aria-current={atual ? "page" : undefined}
                    aria-label={`${MES_CURTO[idx]}: sobrou ${formatBRL(v)}`}
                    title={`${MES_CURTO[idx]}: ${formatBRL(v)}`}
                    className={`flex flex-col items-center gap-1 rounded-md p-0.5 ${FOCO} ${atual ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
                  >
                    <span className="relative block h-28 w-full">
                      <span
                        className={`absolute inset-x-0 rounded-sm ${v < 0 ? "bg-red-600" : atual ? "bg-(--tatu-ink)" : "bg-(--tatu-olive)"}`}
                        style={v < 0 ? { top: `${zero}%`, height: `${h}%` } : { bottom: `${100 - zero}%`, height: `${h}%` }}
                      />
                    </span>
                    <span className={`text-xs ${atual ? "font-medium text-neutral-900" : "text-neutral-600"}`}>{MES_CURTO[idx]}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={`${CARTAO} lg:col-span-3 lg:row-start-3`}>
          <h2 className="text-lg font-medium text-neutral-900">Margem por cliente</h2>
          <p className="mb-3 text-base text-neutral-600">
            O que cada cliente rendeu em {mesNome(month)} menos os gastos lançados só com ele. Para um gasto entrar aqui, escolha o cliente em + Lançar saída.
          </p>
          {clientes.length === 0 ? (
            <p className="text-base text-neutral-600">Nenhum cliente com valor neste mês.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {clientes.map((cl) => (
                <li key={cl.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-neutral-900">{cl.name}</p>
                    <p className="text-sm text-neutral-500">
                      Rendeu {formatBRL(cl.rendeu)} · gastou {formatBRL(cl.gastou)}
                    </p>
                  </div>
                  <div className="col-span-2 row-start-2 h-2 rounded-full bg-neutral-100 sm:col-span-1 sm:col-start-2 sm:row-start-1" role="img" aria-label={`Margem de ${cl.margem}%`}>
                    <div className="h-2 rounded-full bg-(--tatu-ink)" style={{ width: `${Math.max(0, Math.min(100, cl.margem))}%` }} />
                  </div>
                  <p className={`text-right text-lg font-medium tabular-nums ${cl.margem < 0 ? "text-red-700" : "text-neutral-900"}`}>{cl.margem}%</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
