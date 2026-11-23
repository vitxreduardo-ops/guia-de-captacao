import Link from "next/link";
import { notFound } from "next/navigation";
import { LancarSaida } from "@/components/admin/SaidasForm";
import { ClienteAcoes, ItemLinha } from "@/components/admin/financeiro/ClienteAcoes";
import { ClienteSeletor } from "@/components/admin/financeiro/ClienteSeletor";
import { EntradaLinha } from "@/components/admin/financeiro/EntradaLinha";
import { mesLongoCurto } from "@/components/admin/financeiro/Linhas";
import { Ancora, CARTAO, Dado, Vazio } from "@/components/admin/financeiro/ui";
import { formatBRL } from "@/lib/billingTypes";
import { FAIXAS, FAIXA_ROTULO, faixaDe, type Faixa } from "@/lib/caixaCalc";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { getClientMoney } from "@/lib/dinheiro";
import { frasePrazo } from "@/lib/dinheiroTexto";
import { listClientExpenses } from "@/lib/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expensesTypes";
import { listGalleryClients } from "@/lib/galleries";
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getCurrentClientScope();
  if (scope !== null && !scope.includes(id)) notFound();
  const verTudo = scope === null;
  const [cliente, todos, gastos] = await Promise.all([
    getClientMoney(id),
    listGalleryClients({ includeArchived: false, clientScope: scope }),
    // Gasto é do estúdio todo: quem só vê alguns clientes não vê.
    verTudo ? listClientExpenses(id) : Promise.resolve([]),
  ]);
  if (!cliente) notFound();

  const hoje = new Date().toLocaleDateString("sv-SE");
  const abertos = cliente.items.filter((i) => i.openCents > 0);
  const recebidos = cliente.items
    .filter((i) => i.paid)
    .map((i) => ({
      cardId: i.cardId,
      name: cliente.name,
      title: i.title,
      date: i.paidAt ?? i.date ?? "",
      cents: i.totalCents,
      method: i.method,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const gastoTotal = gastos.reduce((s, e) => s + e.amountCents, 0);
  const faturado = cliente.receivedCents + cliente.openCents;
  const margem = faturado > 0 ? Math.round(((faturado - gastoTotal) / faturado) * 100) : null;

  const grupos = new Map<Faixa, typeof abertos>();
  for (const i of abertos) {
    const f = faixaDe(i.dueOn, hoje);
    grupos.set(f, [...(grupos.get(f) ?? []), i]);
  }
  const meses = [...new Set(cliente.items.map((i) => i.month).filter((m): m is string => m !== null))]
    .sort()
    .reverse()
    .map((key) => ({ key, label: mesLongoCurto(key) }));
  const opcoes = todos.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/financeiro/contas" className="inline-flex min-h-11 items-center text-base text-neutral-600 underline hover:text-neutral-900">
          Todos os clientes
        </Link>
        <ClienteSeletor clientes={opcoes} atual={id} />
      </div>

      <Ancora label={`Resumo de ${cliente.name}`} className="grid gap-x-8 gap-y-5 lg:grid-cols-[1fr_2fr] lg:items-end">
        <div className="min-w-0">
          <h2 className="text-2xl font-medium">{cliente.name}</h2>
          <p className="text-sm text-(--tatu-cream)/75">
            {cliente.paymentDay ? `Paga todo dia ${cliente.paymentDay}` : "Sem dia de pagamento combinado"}
            {cliente.phone ? ` · ${cliente.phone}` : ""}
          </p>
        </div>
        <div className={`grid gap-3 ${verTudo ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
          <Dado escuro label="Já recebeu" cents={cliente.receivedCents} />
          <Dado escuro label="Em aberto" cents={cliente.openCents} />
          <Dado escuro label="Atrasado" cents={cliente.overdueCents} tom={cliente.overdueCents > 0 ? "text-red-300" : ""} />
          {verTudo ? (
            <Dado
              escuro
              label="Margem"
              cents={faturado - gastoTotal}
              note={margem === null ? "sem valores ainda" : `${margem}% de ${formatBRL(faturado)}`}
            />
          ) : null}
        </div>
      </Ancora>

      <section className={CARTAO}>
        <ClienteAcoes client={cliente} abertos={abertos} meses={meses} />
      </section>

      <section className={CARTAO} aria-labelledby="aberto-titulo">
        <h2 id="aberto-titulo" className="text-lg font-medium text-neutral-900">
          Em aberto <span className="font-normal text-neutral-500">· {formatBRL(cliente.openCents)}</span>
        </h2>
        {abertos.length === 0 ? (
          <p className="mt-2 text-base text-neutral-600">Nada a receber deste cliente.</p>
        ) : (
          FAIXAS.filter((f) => grupos.has(f)).map((f) => (
            <div key={f}>
              <h3 className={`mt-4 text-sm font-medium ${f === "atrasado" ? "text-red-700" : "text-neutral-600"}`}>
                {FAIXA_ROTULO[f]} · {formatBRL(grupos.get(f)!.reduce((s, i) => s + i.openCents, 0))}
              </h3>
              <ul className="divide-y divide-neutral-100">
                {grupos.get(f)!.map((item) => (
                  <ItemLinha key={item.cardId} item={item} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="recebido-titulo">
        <h2 id="recebido-titulo" className="mb-2 text-lg font-medium text-neutral-900">
          Recebido <span className="font-normal text-neutral-500">· {formatBRL(cliente.receivedCents)}</span>
        </h2>
        {recebidos.length === 0 ? (
          <Vazio>Ainda não entrou nenhum pagamento deste cliente.</Vazio>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {recebidos.map((r) => (
              <EntradaLinha
                key={r.cardId}
                entrada={r}
                mostrarCliente={false}
                mostrarData
              />
            ))}
          </ul>
        )}
      </section>

      {verTudo ? (
        <section className={CARTAO} aria-labelledby="gastos-titulo">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="gastos-titulo" className="text-lg font-medium text-neutral-900">
              Gastos com {cliente.name} <span className="font-normal text-neutral-500">· {formatBRL(gastoTotal)}</span>
            </h2>
            <LancarSaida today={hoje} clientes={opcoes} clienteInicial={id} variante="contorno" />
          </div>
          {gastos.length === 0 ? (
            <p className="mt-2 text-base text-neutral-600">Nenhum gasto lançado só com este cliente. Eles entram na margem.</p>
          ) : (
            <ul className="mt-1 divide-y divide-neutral-100">
              {gastos.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-base text-neutral-900">{e.description || "Sem descrição"}</p>
                    <p className="text-sm text-neutral-500">
                      {EXPENSE_CATEGORY_LABELS[e.category]} · {e.paid ? "pago" : "a pagar"} · {frasePrazo(e.spentOn)}
                    </p>
                  </div>
                  <span className="text-base tabular-nums text-neutral-900">{formatBRL(e.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
