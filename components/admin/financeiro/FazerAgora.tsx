import Link from "next/link";
import { CobrarLink } from "@/components/admin/ContaPix";
import { BotaoAcao } from "@/components/admin/financeiro/Acoes";
import { BOTAO, CARTAO } from "@/components/admin/financeiro/ui";
import { mesLongoCurto } from "@/components/admin/financeiro/Linhas";
import { markPaidAction } from "@/app/admin/financeiro/actions";
import { markExpensePaidAction } from "@/app/admin/financeiro/saidas";
import { formatBRL } from "@/lib/billingTypes";
import { frasePrazo } from "@/lib/dinheiroTexto";
import { SemDataLinha } from "@/components/admin/financeiro/SemDataLinha";
import type { ReceivableRow, SemDataRow } from "@/lib/dinheiro";
import type { Expense } from "@/lib/expensesTypes";

const LIMITE = 5;

/**
 * A fila do dia, numa lista só: o que está atrasado para receber, o que
 * vence para pagar e o que está fora da conta por falta de dia combinado.
 * Cada linha já traz o botão que resolve, sem trocar de aba.
 */
export function FazerAgora({
  receber,
  pagar,
  semData = [],
  hoje,
  className = "",
}: {
  receber: ReceivableRow[];
  semData?: SemDataRow[];
  pagar: Expense[];
  hoje: string;
  className?: string;
}) {
  const limite = new Date(`${hoje}T12:00:00`);
  limite.setDate(limite.getDate() + 2);
  const ate = limite.toLocaleDateString("sv-SE");

  const atrasadas = receber.filter((r) => r.due !== null && r.due < hoje);
  const vencendo = pagar.filter((e) => !e.recurringId && e.spentOn <= ate);
  const semDia = receber.filter((r) => r.due === null);
  const total = semData.length + atrasadas.length + vencendo.length + (semDia.length ? 1 : 0);

  // Do mais antigo ao mais novo: atrasado há mais tempo primeiro, de receber e de pagar misturados.
  const linhas = [
    ...atrasadas.map((r) => ({ data: r.due!, no: <LinhaReceberAgora key={`r${r.cardIds[0]}`} r={r} /> })),
    ...vencendo.map((e) => ({ data: e.spentOn, no: <LinhaPagarAgora key={`p${e.id}${e.spentOn}`} e={e} hoje={hoje} /> })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  // Dado quebrado vem primeiro: enquanto não for corrigido, os números não batem entre as telas.
  const fixas = semData.length + (semDia.length ? 1 : 0);
  const exibidas = linhas.slice(0, Math.max(0, LIMITE - fixas));
  const resto = total - exibidas.length - fixas;

  return (
    <section aria-labelledby="fazer-agora" className={`${CARTAO} ${className}`}>
      <h2 id="fazer-agora" className="text-lg font-medium text-neutral-900">
        {total > 0 ? "Para fazer agora" : "Para fazer agora"}
        {total > 0 ? <span className="font-normal text-neutral-500">{` · ${total}`}</span> : null}
      </h2>
      {total === 0 ? (
        <div className="py-6 text-center">
          <p className="text-base font-medium text-neutral-900">Tudo em dia</p>
          <p className="text-base text-neutral-600">Nada atrasado para receber nem conta vencendo.</p>
        </div>
      ) : (
        <ul className="mt-1 divide-y divide-neutral-100">
          {semData.map((r) => (
            <SemDataLinha key={`d${r.cardId}`} r={r} />
          ))}
          {exibidas.map((l) => l.no)}
          {semDia.length ? (
            <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <div className="min-w-0 flex-1 basis-44">
                <p className="text-base font-medium text-neutral-900">
                  {semDia.length === 1 ? semDia[0].name : `${semDia.length} cobranças`} sem dia combinado
                </p>
                <p className="text-sm text-neutral-500">
                  {formatBRL(semDia.reduce((s, r) => s + r.cents, 0))} ficam fora da projeção do caixa
                </p>
              </div>
              <Link href="/admin/financeiro/clientes" className={BOTAO.contorno}>
                Cadastrar o dia
              </Link>
            </li>
          ) : null}
        </ul>
      )}
      {resto > 0 ? (
        <Link href="/admin/financeiro/pagar-e-receber" className="mt-1 inline-flex min-h-11 items-center text-base text-neutral-600 underline hover:text-neutral-900">
          Ver mais {resto} em A pagar e receber
        </Link>
      ) : null}
    </section>
  );
}

function LinhaReceberAgora({ r }: { r: ReceivableRow }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-red-600" />
      <div className="min-w-0 flex-1 basis-44">
        <p className="text-base text-neutral-900">
          <span className="font-medium">{r.name}</span> {frasePrazo(r.due)}
        </p>
        <p className="text-sm text-neutral-500">
          {mesLongoCurto(r.month)} · {formatBRL(r.cents)}
        </p>
      </div>
      <div className="flex gap-2">
        <CobrarLink
          cliente={r}
          mesNome={mesLongoCurto(r.month)}
          cents={r.cents}
          rotulo="Cobrar"
          ariaLabel={`Cobrar ${r.name} no WhatsApp`}
          className={BOTAO.contorno}
        />
        <BotaoAcao action={markPaidAction} campos={{ card: r.cardIds }} ariaLabel={`Marcar ${r.name} como recebido`} variante="cheio">
          Recebi
        </BotaoAcao>
      </div>
    </li>
  );
}

function LinhaPagarAgora({ e, hoje }: { e: Expense; hoje: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${e.spentOn < hoje ? "bg-red-600" : "bg-amber-500"}`} />
      <div className="min-w-0 flex-1 basis-44">
        <p className="text-base text-neutral-900">
          <span className="font-medium">{e.description || "Conta"}</span> {frasePrazo(e.spentOn)}
        </p>
        <p className="text-sm text-neutral-500">Pagar · {formatBRL(e.amountCents)}</p>
      </div>
      <BotaoAcao action={markExpensePaidAction} campos={{ id: e.id }} ariaLabel={`Marcar ${e.description || "conta"} como paga`} variante="cheio">
        Paguei
      </BotaoAcao>
    </li>
  );
}
