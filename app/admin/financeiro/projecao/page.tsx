import { EditarValor } from "@/components/admin/financeiro/Acoes";
import { ProjecaoInterativa } from "@/components/admin/financeiro/ProjecaoInterativa";
import { Ancora, Barra, CARTAO, Dado, Dinheiro, Vazio } from "@/components/admin/financeiro/ui";
import { getCaixa } from "@/lib/caixa";
import { formatBRL, monthLabel } from "@/lib/billingTypes";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { saveCashAction, saveReserveGoalAction } from "../caixa";
export const dynamic = "force-dynamic";

const nomeMes = (m: string) => monthLabel(m).split(" de ")[0];

export default async function Page() {
  if ((await getCurrentClientScope()) !== null) {
    return <Vazio>A projeção do caixa só aparece para quem tem acesso a todos os clientes.</Vazio>;
  }
  const c = await getCaixa();
  if (!c.projecao || c.caixaHoje === null || c.livre === null) {
    return (
      <Ancora label="Informar saldo" className="flex flex-col items-start gap-4">
        <p className="text-xl leading-snug">A projeção parte do que você tem em caixa hoje. Informe o saldo para ver os próximos meses.</p>
        <EditarValor
          rotulo="Informar saldo"
          titulo="Quanto tem na conta agora?"
          dica="Olhe o saldo no banco e digite aqui."
          action={saveCashAction}
          placeholder="R$ 0,00"
          variante="claro"
        />
      </Ancora>
    );
  }
  const p = c.projecao;
  const meta = c.settings.reserveGoalMonths;
  const metaMeses = String(meta).replace(".", ",");
  const reservaMeses = c.reservaMeses;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <Ancora label="Livre para gastar hoje" className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <div>
          <p className="text-sm text-(--tatu-cream)/75">Livre para gastar hoje</p>
          <Dinheiro cents={c.livre} className="text-4xl" />
          <p className="text-sm text-(--tatu-cream)/75">sem passar da sua reserva mínima</p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-(--tatu-cream)/20 pt-4">
          <Dado escuro label="Menor caixa" cents={p.menorCents} note={p.menorMes ? `em ${nomeMes(p.menorMes)}` : "hoje"} />
          <Dado escuro label="Reserva mínima" cents={c.reservaMinima} note="1 mês de custo" />
        </div>
        {p.semDataCents > 0 ? (
          <p className="text-sm text-(--tatu-cream)/75">
            {formatBRL(p.semDataCents)} a receber estão sem dia combinado e ficam fora desta conta.
          </p>
        ) : null}
      </Ancora>

      <ProjecaoInterativa
        base={p}
        reservaMinima={c.reservaMinima}
        classeGrafico="lg:col-start-2 lg:row-start-1"
        classeSimulador="lg:col-start-1 lg:row-start-2"
      />

      <section className={`${CARTAO} lg:col-start-2 lg:row-start-2`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium text-neutral-900">Sua reserva</h2>
            <p className="text-base text-neutral-600">Quanto tempo o caixa aguenta pagando só os custos.</p>
          </div>
          <EditarValor
            rotulo="Mudar meta"
            titulo="Meta de reserva, em meses de custo"
            dica="Quantos meses de custo o estúdio quer ter guardados."
            action={saveReserveGoalAction}
            valorInicial={metaMeses}
            sufixo="meses"
          />
        </div>
        {reservaMeses === null ? (
          <p className="mt-3 text-base text-neutral-600">Lance as saídas do estúdio para o app calcular quantos meses de custo o caixa cobre.</p>
        ) : (
          <>
            <p className="mt-3 text-3xl font-medium tabular-nums text-neutral-900">
              {reservaMeses.toFixed(1).replace(".", ",")} <span className="text-lg font-normal text-neutral-600">meses · meta {metaMeses}</span>
            </p>
            <div className="mt-2"><Barra pct={(reservaMeses / meta) * 100} rotulo="Reserva em meses de custo" /></div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Dado label="Em caixa" cents={c.caixaHoje} />
              <Dado label="Custo por mês" cents={c.custoMensal} note="média de 3 meses" />
              <Dado label="Meta em reais" cents={Math.round(c.custoMensal * meta)} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
