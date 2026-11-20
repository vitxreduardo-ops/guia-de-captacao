import { Secao, ListaHoje, Numero, lerParametros } from "../_comum";
import { ContaSelect } from "@/components/admin/ContaPix";
import { getTodayView, type TodayRow } from "@/lib/dinheiro";
export const dynamic = "force-dynamic";

async function HojeAba({ scope }: { scope: string[] | null }) {
  const v = await getTodayView(scope);
  const sum = (rows: TodayRow[]) => rows.reduce((s, r) => s + r.cents, 0);
  const tudoEmDia = v.late.length === 0 && v.upcoming.length === 0 && v.noDay.length === 0;

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <Numero label="Atrasado" value={sum(v.late)} tone={v.late.length ? "text-red-700" : "text-neutral-600"} note={v.late.length ? `${v.late.length} ${v.late.length === 1 ? "cobrança" : "cobranças"}` : "nada atrasado"} />
        <Numero label="A receber em 7 dias" value={sum(v.upcoming)} />
        <Numero label="Entrou em 7 dias" value={sum(v.received)} />
      </div>

      {v.late.length + v.upcoming.length + v.noDay.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label htmlFor="conta-cobranca" className="text-base text-neutral-600">
            Chave Pix que vai na mensagem de cobrança:
          </label>
          <ContaSelect id="conta-cobranca" ariaLabel="Conta que recebe o Pix" />
        </div>
      ) : null}

      {tudoEmDia && v.received.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-lg text-neutral-600">
          Nada pendente por aqui. Quando um trabalho for para a coluna de pagamento no quadro de Entregas, ele aparece.
        </p>
      ) : null}

      {v.late.length > 0 ? (
        <Secao titulo="Atrasado" dica="Toque em Cobrar para abrir o WhatsApp com a mensagem pronta">
          <ListaHoje rows={v.late} mostrarCobrar />
        </Secao>
      ) : null}
      {v.upcoming.length > 0 ? (
        <Secao titulo="A receber nos próximos 7 dias">
          <ListaHoje rows={v.upcoming} mostrarCobrar />
        </Secao>
      ) : null}
      {v.noDay.length > 0 ? (
        <Secao titulo="Sem dia combinado" dica="Sem dia de pagamento cadastrado, nunca aparecem como atrasados">
          <ListaHoje rows={v.noDay} mostrarCobrar />
        </Secao>
      ) : null}
      {v.received.length > 0 ? (
        <Secao titulo="Entrou nos últimos 7 dias">
          <ListaHoje rows={v.received} />
        </Secao>
      ) : null}
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; base?: string }>;
}) {
  const { scope } = await lerParametros(searchParams);
  return (
    <>
      <HojeAba scope={scope} />
    </>
  );
}
