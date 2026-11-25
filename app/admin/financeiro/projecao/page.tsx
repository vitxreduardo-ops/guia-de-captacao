import { EditarCampos, EditarValor } from "@/components/admin/financeiro/Acoes";
import { ProjecaoInterativa } from "@/components/admin/financeiro/ProjecaoInterativa";
import { Ancora, Barra, CARTAO, Dado, Dinheiro, Vazio } from "@/components/admin/financeiro/ui";
import { getCaixa } from "@/lib/caixa";
import { formatBRL, monthLabel } from "@/lib/billingTypes";
import { rotuloReserva } from "@/lib/caixaCalc";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { saveCashAction, saveReserveMinAction } from "../caixa";
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
  const { reserveMinCents, reserveMinMonths } = c.settings;
  const origemTxt = rotuloReserva(c.reservaOrigem, reserveMinMonths);
  const folga = c.reservaFolga ?? 0;

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
          <Dado escuro label="Reserva mínima" cents={c.reservaMinima} note={origemTxt} />
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
            <h2 className="text-lg font-medium text-neutral-900">Reserva mínima em caixa</h2>
            <p className="text-base text-neutral-600">O piso que o caixa não pode furar.</p>
          </div>
          <EditarCampos
            rotulo="Mudar"
            titulo="Reserva mínima em caixa"
            dica="Preencha o valor, os meses de custo ou os dois (vale o maior). Com os dois vazios, vale 1 mês de custo. Retiradas de pró-labore entram na conta do custo quando lançadas como saída; o valor fixo não depende delas."
            action={saveReserveMinAction}
            campos={[
              {
                name: "valor",
                label: "Valor mínimo em caixa",
                placeholder: "R$ 5.000,00",
                valorInicial: reserveMinCents !== null ? (reserveMinCents / 100).toFixed(2).replace(".", ",") : "",
              },
              {
                name: "meses",
                label: "Meses de custo",
                placeholder: "Ex.: 2",
                sufixo: "meses",
                valorInicial: reserveMinMonths !== null ? String(reserveMinMonths).replace(".", ",") : "",
              },
            ]}
          />
        </div>
        <p className="mt-3 text-3xl font-medium tabular-nums text-neutral-900">{formatBRL(c.reservaMinima)}</p>
        <p className="text-sm text-neutral-500">{origemTxt}</p>
        <div className="mt-3">
          <Barra pct={c.reservaMinima > 0 ? (c.caixaHoje / c.reservaMinima) * 100 : 100} rotulo="Caixa em relação à reserva mínima" />
        </div>
        <p className={`mt-1 text-base ${folga < 0 ? "text-red-700" : "text-neutral-600"}`}>
          {folga >= 0 ? `Folga de ${formatBRL(folga)} acima do mínimo.` : `Faltam ${formatBRL(-folga)} para chegar ao mínimo.`}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Dado label="Em caixa" cents={c.caixaHoje} />
          <Dado label="Custo por mês" cents={c.custoMensal} note="média de 3 meses" />
          <div className="min-w-0">
            <p className="text-sm text-neutral-600">Cobre</p>
            <p className="text-lg font-medium tabular-nums">
              {c.reservaMeses === null ? "—" : `${c.reservaMeses.toFixed(1).replace(".", ",")} meses`}
            </p>
            <p className="text-sm text-neutral-500">de custo, só informação</p>
          </div>
        </div>
      </section>
    </div>
  );
}
