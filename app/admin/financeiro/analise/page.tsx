import Link from "next/link";
import { BotaoAcao, EditarValor } from "@/components/admin/financeiro/Acoes";
import { SobrouAno } from "@/components/admin/financeiro/SobrouAno";
import { FazerAgora } from "@/components/admin/financeiro/FazerAgora";
import { Ancora, Anel, CARTAO, Dado, Dinheiro, Vazio } from "@/components/admin/financeiro/ui";
import { getCaixa, getResultadoAno, listReserveDeposits } from "@/lib/caixa";
import { formatBRL, monthKey } from "@/lib/billingTypes";
import { getMoneyMonth, getSemDataPagamento } from "@/lib/dinheiro";
import { getClientCosts } from "@/lib/expenses";
import { markReserveDoneAction, saveReserveBaseAction, saveRevenueGoalAction, saveReserveRateAction, unmarkReserveDoneAction } from "../caixa";
import { SetaMes, href, lerParametros, shiftMonth } from "../_comum";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { scope, month, thisMonth, nome, mesNome, year } = await lerParametros(searchParams);
  if (scope !== null) {
    return <Vazio>A análise do estúdio só aparece para quem tem acesso a todos os clientes.</Vazio>;
  }
  const [c, ano, dadosMes, custos, depositos, semData] = await Promise.all([
    getCaixa(),
    getResultadoAno(year),
    getMoneyMonth(month, null),
    getClientCosts(month),
    listReserveDeposits(),
    getSemDataPagamento(null),
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
  // Só conta na reserva guardada o que foi marcado como "Reserva feita", somado ao que já havia.
  const guardada = c.settings.reserveBaseCents + depositos.reduce((s, d) => s + d.cents, 0);
  const feitaNoMes = depositos.some((d) => d.month === monthKey(month));
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

        <FazerAgora receber={c.receber} pagar={c.pagar} semData={semData} hoje={c.hoje} className="lg:col-span-2 lg:col-start-1 lg:row-start-2" />

        <section className={`${CARTAO} lg:col-start-3 lg:row-start-1`}>
          <h2 className="text-sm text-neutral-600">Reserva estimada</h2>
          <Dinheiro cents={reservaDe(entrou)} className="text-2xl" centavos={false} />
          <p className="text-sm text-neutral-500">{taxaTexto}% sobre o que entrou em {mesNome(month)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {feitaNoMes ? (
              <BotaoAcao action={unmarkReserveDoneAction} campos={{ mes: month }} variante="contorno" ariaLabel="Reserva feita. Toque para desfazer">
                ✓ Reserva feita
              </BotaoAcao>
            ) : (
              <BotaoAcao action={markReserveDoneAction} campos={{ mes: month }} variante="cheio">
                Reserva feita
              </BotaoAcao>
            )}
            <EditarValor
              rotulo="Mudar % de reserva"
              titulo="% de reserva estimada"
              dica="Quanto de tudo que entra o estúdio separa como reserva (por enquanto não há imposto a pagar)."
              action={saveReserveRateAction}
              valorInicial={taxaTexto}
              sufixo="%"
            />
          </div>
          <div className="mt-3 flex items-end justify-between gap-2 border-t border-neutral-100 pt-3">
            <Dado
              label="Guardado na reserva"
              cents={guardada}
              note={`${depositos.length} ${depositos.length === 1 ? "mês marcado" : "meses marcados"}${c.settings.reserveBaseCents > 0 ? ` + ${formatBRL(c.settings.reserveBaseCents)} que já havia` : ""}`}
            />
            <EditarValor
              icone
              rotulo="Editar o valor já guardado"
              titulo="Quanto já tem na reserva?"
              dica="Informe o que já está guardado. Cada mês em que você tocar em Reserva feita soma ao valor."
              action={saveReserveBaseAction}
              valorInicial={c.settings.reserveBaseCents > 0 ? (c.settings.reserveBaseCents / 100).toFixed(2).replace(".", ",") : ""}
              placeholder="R$ 0,00"
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
          <SobrouAno
            ano={year}
            atual={i}
            meses={sobrouMes.map((v, idx) => ({
              href: href("analise", `${year}-${String(idx + 1).padStart(2, "0")}-01`),
              entrou: ano.entrou[idx],
              saiu: ano.saiu[idx],
              reserva: reservaDe(ano.entrou[idx]),
              sobrou: v,
            }))}
          />
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
