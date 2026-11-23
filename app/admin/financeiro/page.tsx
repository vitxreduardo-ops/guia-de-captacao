import Link from "next/link";
import { LancarSaida } from "@/components/admin/SaidasForm";
import { CaixaGrafico } from "@/components/admin/financeiro/CaixaGrafico";
import { EditarValor } from "@/components/admin/financeiro/Acoes";
import { FazerAgora } from "@/components/admin/financeiro/FazerAgora";
import { Ancora, BOTAO, Barra, CARTAO, Dinheiro } from "@/components/admin/financeiro/ui";
import { getCaixa, getResultadoAno, getUltimosLancamentos, listClientOptions } from "@/lib/caixa";
import { formatBRL, monthKey } from "@/lib/billingTypes";
import { doMes, faixaDe } from "@/lib/caixaCalc";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { frasePrazo, quando } from "@/lib/dinheiroTexto";
import { saveCashAction, saveRevenueGoalAction } from "./caixa";
import { mesLongo } from "./_comum";
export const dynamic = "force-dynamic";

const paraCampo = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function Page() {
  const scope = await getCurrentClientScope();
  const verTudo = scope === null;
  const c = await getCaixa(scope);
  const mes = monthKey(c.hoje);
  const ano = Number(mes.slice(0, 4));
  const [resultado, ultimos, clientes] = await Promise.all([
    verTudo ? getResultadoAno(ano) : Promise.resolve(null),
    getUltimosLancamentos(6),
    verTudo ? listClientOptions() : Promise.resolve([]),
  ]);
  const i = Number(mes.slice(5, 7)) - 1;
  const entrou = resultado?.entrou[i] ?? 0;
  const reservaEstimada = Math.round((entrou * c.settings.reserveRateBps) / 10_000);
  const sobrou = entrou - (resultado?.saiu[i] ?? 0) - reservaEstimada;
  const meta = c.settings.revenueGoalCents;

  const somaReceber = c.receber.reduce((s, r) => s + r.cents, 0);
  const atrasadoReceber = c.receber.filter((r) => faixaDe(r.due, c.hoje) === "atrasado").reduce((s, r) => s + r.cents, 0);
  // A pagar é o do mês corrente (com o que já venceu); os meses seguintes ficam em A pagar e receber.
  const pagarMes = doMes(c.pagar, (e) => e.spentOn, mes, c.hoje);
  const somaPagar = pagarMes.reduce((s, e) => s + e.amountCents, 0);
  const atrasadoPagar = pagarMes.filter((e) => e.spentOn < c.hoje).reduce((s, e) => s + e.amountCents, 0);

  const [atualizadoEm] = c.settings.cashOn ? [c.settings.cashOn.split("-").reverse().join("/")] : [null];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
      {/* Cartão âncora: o número que responde "como estou?" */}
      <Ancora label="Em caixa" className="flex flex-col gap-5 lg:row-span-2">
        {verTudo ? (
          c.caixaHoje === null ? (
            <>
              <div>
                <p className="text-sm text-(--tatu-cream)/75">Em caixa</p>
                <p className="mt-1 text-xl leading-snug">Informe quanto tem na conta e o app passa a somar o que entra e sai.</p>
              </div>
              <EditarValor
                rotulo="Informar saldo"
                titulo="Quanto tem na conta agora?"
                dica="Olhe o saldo no banco e digite aqui. Daí em diante, o que você marcar como Recebi e Paguei entra na conta sozinho."
                action={saveCashAction}
                placeholder="R$ 0,00"
                variante="claro"
              />
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-(--tatu-cream)/75">Em caixa</p>
                <Dinheiro cents={c.caixaHoje} className={`text-4xl ${c.caixaHoje < 0 ? "text-red-300" : ""}`} />
                <p className="mt-1 text-sm text-(--tatu-cream)/75">Conferido em {atualizadoEm}. O que entra e sai depois soma sozinho.</p>
              </div>
              <EditarValor
                rotulo="Conferir saldo"
                titulo="Quanto tem na conta agora?"
                dica="Corrige o número se o banco mostrar outro valor."
                action={saveCashAction}
                valorInicial={paraCampo(c.caixaHoje)}
                variante="claro"
              />
            </>
          )
        ) : (
          <div>
            <p className="text-sm text-(--tatu-cream)/75">A receber dos seus clientes</p>
            <Dinheiro cents={somaReceber} className="text-4xl" />
            {atrasadoReceber > 0 ? <p className="mt-1 text-sm text-(--tatu-cream)/75">{formatBRL(atrasadoReceber)} atrasado</p> : null}
          </div>
        )}

        {verTudo ? (
          <dl className="grid gap-1.5 text-base">
            <dt className="text-sm text-(--tatu-cream)/75 first-letter:uppercase">{mesLongo(mes)}</dt>
            {[["Entrou", entrou, "+"], ["Saiu", resultado?.saiu[i] ?? 0, "−"]].map(([rotulo, v, sinal]) => (
              <div key={rotulo as string} className="flex items-baseline justify-between gap-3">
                <dd className="text-(--tatu-cream)/85">{rotulo}</dd>
                <dd className="tabular-nums">{sinal} {formatBRL(v as number)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 border-t border-(--tatu-cream)/20 pt-1.5">
              <dd className="font-medium">Sobrou</dd>
              <dd className={`font-medium tabular-nums ${sobrou < 0 ? "text-red-300" : ""}`}>{formatBRL(sobrou)}</dd>
            </div>
          </dl>
        ) : null}

        {verTudo ? (
          <div className="mt-auto grid gap-4 border-t border-(--tatu-cream)/20 pt-4">
            <div>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-sm text-(--tatu-cream)/75">Meta de faturamento de {mesLongo(mes)}</p>
                {meta ? <p className="text-sm tabular-nums">{Math.max(0, Math.round((entrou / meta) * 100))}%</p> : null}
              </div>
              {meta ? (
                <>
                  <Barra pct={(entrou / meta) * 100} escuro rotulo={`Meta de faturamento de ${mesLongo(mes)}`} />
                  <p className="mt-1 text-sm text-(--tatu-cream)/75">
                    {entrou >= meta ? `Meta batida: entrou ${formatBRL(entrou)}` : `Faltam ${formatBRL(meta - entrou)} de ${formatBRL(meta)}`}
                  </p>
                </>
              ) : (
                <EditarValor
                  rotulo="Definir meta"
                  titulo="Meta de faturamento do mês"
                  dica="Quanto o estúdio quer faturar por mês, contando o que entra no caixa."
                  action={saveRevenueGoalAction}
                  placeholder="R$ 0,00"
                  variante="claro"
                />
              )}
            </div>
            {c.reservaMeses !== null ? (
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="text-sm text-(--tatu-cream)/75">Reserva</p>
                  <p className="text-sm tabular-nums">
                    {c.reservaMeses.toFixed(1).replace(".", ",")} de {String(c.settings.reserveGoalMonths).replace(".", ",")} meses
                  </p>
                </div>
                <Barra pct={(c.reservaMeses / c.settings.reserveGoalMonths) * 100} escuro rotulo="Reserva em meses de custo" />
              </div>
            ) : null}
            <LancarSaida today={c.hoje} clientes={clientes} variante="claro" />
          </div>
        ) : null}
      </Ancora>

      {/* No celular a fila de ações vem logo depois do número; no desktop ela desce para a segunda linha. */}
      <FazerAgora receber={c.receber} pagar={c.pagar} hoje={c.hoje} className="lg:col-span-2 lg:col-start-2 lg:row-start-2" />

      <section className={`${CARTAO} lg:col-start-2 lg:row-start-1`}>
        <h2 className="text-sm text-neutral-600">A receber</h2>
        <Dinheiro cents={somaReceber} className="text-2xl" centavos={false} />
        <p className="text-sm text-neutral-500">
          {c.receber.length === 0 ? "Nada em aberto" : atrasadoReceber > 0 ? `${formatBRL(atrasadoReceber)} atrasado` : "Tudo no prazo"}
        </p>
        <MiniLista
          vazio="Quando um trabalho vai para a coluna de pagamento em Entregas, ele aparece aqui."
          itens={c.receber.slice(0, 3).map((r) => ({
            key: `${r.clientId}${r.month}${r.due}`,
            titulo: r.name,
            detalhe: frasePrazo(r.due),
            cents: r.cents,
            alerta: faixaDe(r.due, c.hoje) === "atrasado",
          }))}
        />
        <Link href="/admin/financeiro/pagar-e-receber" className="mt-1 inline-flex min-h-11 items-center text-base text-neutral-600 underline hover:text-neutral-900">
          Ver todas
        </Link>
      </section>

      {verTudo ? (
        <section className={`${CARTAO} lg:col-start-3 lg:row-start-1`}>
          <h2 className="text-sm text-neutral-600">A pagar em {mesLongo(mes)}</h2>
          <Dinheiro cents={somaPagar} className="text-2xl" centavos={false} />
          <p className="text-sm text-neutral-500">
            {pagarMes.length === 0 ? "Nada em aberto" : atrasadoPagar > 0 ? `${formatBRL(atrasadoPagar)} vencido` : "Nada vencido"}
          </p>
          <MiniLista
            vazio="Use + Lançar saída e escolha Vou pagar para a conta aparecer aqui."
            itens={pagarMes.slice(0, 3).map((e) => ({
              key: `${e.id}${e.spentOn}`,
              titulo: e.description || "Sem descrição",
              detalhe: frasePrazo(e.spentOn),
              cents: e.amountCents,
              alerta: e.spentOn < c.hoje,
            }))}
          />
          <Link href="/admin/financeiro/pagar-e-receber" className="mt-1 inline-flex min-h-11 items-center text-base text-neutral-600 underline hover:text-neutral-900">
            Ver todas
          </Link>
        </section>
      ) : null}

      {verTudo ? (
        <section className={`${CARTAO} lg:col-span-2 lg:col-start-1 lg:row-start-3`}>
          <h2 className="text-lg font-medium text-neutral-900">Seu caixa nos próximos 6 meses</h2>
          {c.projecao ? (
            <>
              <p className="mb-3 text-base text-neutral-600">
                {c.projecao.menorCents >= c.reservaMinima
                  ? `Fica acima da reserva mínima. Ponto mais baixo: ${formatBRL(c.projecao.menorCents)}.`
                  : `Passa abaixo da reserva mínima. Ponto mais baixo: ${formatBRL(c.projecao.menorCents)}.`}
              </p>
              <CaixaGrafico
                meses={c.projecao.meses}
                caixaHoje={c.projecao.caixaHoje}
                reservaMinima={c.reservaMinima}
                resumo={`Caixa projetado: ponto mais baixo ${formatBRL(c.projecao.menorCents)}`}
              />
              <Link href="/admin/financeiro/projecao" className={`${BOTAO.contorno} mt-3`}>
                Abrir projeção e simulador
              </Link>
            </>
          ) : (
            <p className="mt-2 text-base text-neutral-600">Informe o saldo em caixa para ver como ficam os próximos meses.</p>
          )}
        </section>
      ) : null}

      <section className={`${CARTAO} ${verTudo ? "lg:col-start-3 lg:row-start-3" : "lg:col-span-2"}`}>
        <h2 className="text-lg font-medium text-neutral-900">Últimos lançamentos</h2>
        {ultimos.length === 0 ? (
          <p className="mt-2 text-base text-neutral-600">Nada entrou nem saiu nos últimos 45 dias.</p>
        ) : (
          <ul className="mt-1 divide-y divide-neutral-100">
            {ultimos.map((l) => (
              <li key={l.key} className="flex items-baseline justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-base text-neutral-900">{l.titulo}</p>
                  <p className="text-sm text-neutral-500">{l.detalhe} · {quando(l.data)}</p>
                </div>
                <span className={`text-base font-medium tabular-nums ${l.tipo === "entrada" ? "text-(--tatu-ink)" : "text-neutral-900"}`}>
                  {l.tipo === "entrada" ? "+" : "−"} {formatBRL(l.cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {verTudo ? (
          <Link href="/admin/financeiro/extrato" className="mt-1 inline-flex min-h-11 items-center text-base text-neutral-600 underline hover:text-neutral-900">
            Abrir o extrato
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function MiniLista({
  itens,
  vazio,
}: {
  itens: { key: string; titulo: string; detalhe: string; cents: number; alerta?: boolean }[];
  vazio: string;
}) {
  if (itens.length === 0) return <p className="mt-3 text-base text-neutral-600">{vazio}</p>;
  return (
    <ul className="mt-2 divide-y divide-neutral-100">
      {itens.map((it) => (
        <li key={it.key} className="flex items-baseline justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-base text-neutral-900">{it.titulo}</p>
            <p className={`text-sm ${it.alerta ? "text-red-700" : "text-neutral-500"}`}>{it.detalhe}</p>
          </div>
          <span className="text-base tabular-nums text-neutral-900">{formatBRL(it.cents)}</span>
        </li>
      ))}
    </ul>
  );
}
