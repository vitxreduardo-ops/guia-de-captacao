import Link from "next/link";
import { ContaSelect } from "@/components/admin/ContaPix";
import { LancarSaida } from "@/components/admin/SaidasForm";
import { BotaoAcao, EditarValor } from "@/components/admin/financeiro/Acoes";
import { LinhaPagar, LinhaReceber } from "@/components/admin/financeiro/Linhas";
import { Ancora, BOTAO, CARTAO, Dado, Dinheiro, Vazio } from "@/components/admin/financeiro/ui";
import { getCaixa, listClientOptions } from "@/lib/caixa";
import { FAIXAS, FAIXA_ROTULO, doMes, faixaDe, fimDoMes, somarMeses, type Faixa } from "@/lib/caixaCalc";
import { formatBRL } from "@/lib/billingTypes";
import { PAGO_POR, PAGO_POR_LABELS } from "@/lib/expensesTypes";
import { reimburseAction } from "../saidas";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { saveCashAction } from "../caixa";
import { mesLongo } from "../_comum";
export const dynamic = "force-dynamic";

function porFaixa<T>(itens: T[], data: (t: T) => string | null, hoje: string) {
  const grupos = new Map<Faixa, T[]>();
  for (const t of itens) {
    const f = faixaDe(data(t), hoje);
    grupos.set(f, [...(grupos.get(f) ?? []), t]);
  }
  return FAIXAS.filter((f) => grupos.has(f)).map((f) => ({ faixa: f, itens: grupos.get(f)! }));
}

const LINK_MES = BOTAO.contorno;

export default async function Page({ searchParams }: { searchParams: Promise<{ pagar?: string }> }) {
  const { pagar: pagarParam } = await searchParams;
  const scope = await getCurrentClientScope();
  const verTudo = scope === null;
  const c = await getCaixa(scope);
  const clientes = verTudo ? await listClientOptions() : [];
  const fim = fimDoMes(c.hoje);

  const receberAteFim = c.receber.filter((r) => r.due !== null && r.due <= fim).reduce((s, r) => s + r.cents, 0);
  const pagarAteFim = c.pagar.filter((e) => e.spentOn <= fim).reduce((s, e) => s + e.amountCents, 0);
  const somaReceber = c.receber.reduce((s, r) => s + r.cents, 0);
  // A pagar mostra um mês por vez (o corrente, com o que já venceu); o seguinte abre por link.
  const atual = `${c.hoje.slice(0, 7)}-01`;
  const mesPagar = /^\d{4}-\d{2}$/.test(pagarParam ?? "") ? `${pagarParam}-01` : atual;
  const mesVisto = mesPagar >= atual && mesPagar <= somarMeses(atual, 5) ? mesPagar : atual;
  const anterior = mesVisto > atual ? somarMeses(mesVisto, -1) : null;
  const seguinte = mesVisto < somarMeses(atual, 5) ? somarMeses(mesVisto, 1) : null;
  // Cartão pessoal não é conta a pagar: fica no bloco Reembolsos (mas segue no total e na projeção).
  const pagarMes = doMes(c.pagar.filter((e) => !e.paidBy), (e) => e.spentOn, mesVisto, c.hoje);
  const reembolsos = PAGO_POR.map((p) => ({ pessoa: p, itens: c.pagar.filter((e) => e.paidBy === p && e.spentOn <= c.hoje) })).filter((r) => r.itens.length > 0);
  const somaPagar = pagarMes.reduce((s, e) => s + e.amountCents, 0);
  const rotuloMes = (m: string) => (m === atual ? "este mês" : mesLongo(m));
  const linkMes = (m: string) => (m === atual ? "/admin/financeiro/pagar-e-receber" : `/admin/financeiro/pagar-e-receber?pagar=${m.slice(0, 7)}`);
  const grupoReceber = porFaixa(c.receber, (r) => r.due, c.hoje);
  const grupoPagar = porFaixa(pagarMes, (e) => e.spentOn, c.hoje);
  const mesFim = mesLongo(`${fim.slice(0, 7)}-01`);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {verTudo ? (
        <Ancora label="Quanto deve ficar em caixa" className="grid gap-x-8 gap-y-5 lg:grid-cols-[1.3fr_2fr] lg:items-end">
          {c.caixaHoje === null ? (
            <>
              <div>
                <p className="text-sm text-(--tatu-cream)/75">Até o fim de {mesFim}</p>
                <p className="mt-1 text-xl leading-snug">Informe o saldo para ver quanto deve ficar em caixa.</p>
              </div>
              <div>
                <EditarValor
                  rotulo="Informar saldo"
                  titulo="Quanto tem na conta agora?"
                  dica="Olhe o saldo no banco e digite aqui."
                  action={saveCashAction}
                  placeholder="R$ 0,00"
                  variante="claro"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-(--tatu-cream)/75">Até o fim de {mesFim} deve ficar em caixa</p>
                <Dinheiro cents={c.caixaHoje + receberAteFim - pagarAteFim} className="text-4xl" />
                <p className="text-sm text-(--tatu-cream)/75">só com o que já está lançado</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Dado escuro label="Em caixa hoje" cents={c.caixaHoje} />
                <Dado escuro label="+ A receber" cents={receberAteFim} />
                <Dado escuro label="− A pagar" cents={pagarAteFim} />
              </div>
            </>
          )}
        </Ancora>
      ) : null}

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${verTudo ? "lg:grid-cols-2" : ""}`}>
        <section className={`${CARTAO} flex flex-col`} aria-labelledby="receber-titulo">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="receber-titulo" className="text-lg font-medium text-neutral-900">A receber</h2>
            <Dinheiro cents={somaReceber} className="text-xl" centavos={false} />
          </div>
          {c.receber.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <label htmlFor="conta-cobranca" className="text-sm text-neutral-600">Pix na mensagem de cobrança:</label>
              <ContaSelect id="conta-cobranca" ariaLabel="Conta que recebe o Pix" />
            </div>
          ) : null}
          {c.receber.length === 0 ? (
            <div className="mt-3 flex flex-1 flex-col">
              <Vazio className="flex flex-1 items-center justify-center">Nada a receber. Quando um trabalho vai para a coluna de pagamento em Entregas, ele aparece aqui.</Vazio>
            </div>
          ) : (
            grupoReceber.map(({ faixa, itens }) => (
              <div key={faixa}>
                <h3 className={`mt-4 text-sm font-medium ${faixa === "atrasado" ? "text-red-700" : "text-neutral-600"}`}>
                  {FAIXA_ROTULO[faixa]} · {formatBRL(itens.reduce((s, r) => s + r.cents, 0))}
                </h3>
                <ul className="divide-y divide-neutral-100">
                  {itens.map((r) => (
                    <LinhaReceber key={`${r.clientId}${r.month}${r.due}`} row={r} atrasada={faixa === "atrasado"} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {verTudo ? (
          <section className={`${CARTAO} flex flex-col`} aria-labelledby="pagar-titulo">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="pagar-titulo" className="text-lg font-medium text-neutral-900">
                A pagar <span className="font-normal text-neutral-500">· {mesLongo(mesVisto)}</span>
              </h2>
              <Dinheiro cents={somaPagar} className="text-xl" centavos={false} />
            </div>
            {mesVisto === atual ? <p className="text-sm text-neutral-500">Inclui o que já venceu e ainda não foi pago.</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LancarSaida today={c.hoje} clientes={clientes} />
              {anterior ? (
                <Link href={linkMes(anterior)} className={LINK_MES}>← {rotuloMes(anterior)}</Link>
              ) : null}
              {seguinte ? (
                <Link href={linkMes(seguinte)} className={LINK_MES}>Abrir {mesLongo(seguinte)} →</Link>
              ) : null}
            </div>
            {pagarMes.length === 0 ? (
              <div className="mt-3 flex flex-1 flex-col">
                <Vazio className="flex flex-1 items-center justify-center">Nada a pagar em {mesLongo(mesVisto)}. Em + Lançar saída, escolha Vou pagar para a conta ficar aqui até você pagar.</Vazio>
              </div>
            ) : (
              grupoPagar.map(({ faixa, itens }) => (
                <div key={faixa}>
                  {/* Num mês futuro tudo é "depois": o título só atrapalha. */}
                  {mesVisto === atual ? (
                    <h3 className={`mt-4 text-sm font-medium ${faixa === "atrasado" ? "text-red-700" : "text-neutral-600"}`}>
                      {FAIXA_ROTULO[faixa]} · {formatBRL(itens.reduce((s, e) => s + e.amountCents, 0))}
                    </h3>
                  ) : null}
                  <ul className="divide-y divide-neutral-100">
                    {itens.map((e) => (
                      <LinhaPagar key={`${e.id}${e.spentOn}`} e={e} atrasada={faixa === "atrasado"} />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        ) : null}
      </div>

      {verTudo ? (
        <section className={CARTAO} aria-labelledby="reembolsos-titulo">
          <h2 id="reembolsos-titulo" className="text-lg font-medium text-neutral-900">Reembolsos</h2>
          <p className="text-base text-neutral-600">
            Gastos do estúdio pagos no cartão pessoal. Saem do caixa quando você marca o reembolso.
          </p>
          {reembolsos.length === 0 ? (
            <div className="mt-3">
              <Vazio>Ninguém tem nada a receber. Ao lançar uma saída, escolha em Pago por quem pagou no cartão.</Vazio>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
              {reembolsos.map(({ pessoa, itens }) => {
                const total = itens.reduce((s, e) => s + e.amountCents, 0);
                const nome = PAGO_POR_LABELS[pessoa];
                return (
                  <div key={pessoa} className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-neutral-600">
                          {nome} · {itens.length} {itens.length === 1 ? "conta" : "contas"}
                        </p>
                        <Dinheiro cents={total} className="text-2xl" />
                      </div>
                      <BotaoAcao
                        action={reimburseAction}
                        campos={{ pessoa }}
                        ariaLabel={`Marcar ${formatBRL(total)} como reembolsado para ${nome}`}
                        variante="cheio"
                      >
                        Reembolsei
                      </BotaoAcao>
                    </div>
                    <ul className="mt-2 divide-y divide-neutral-100">
                      {itens.map((e) => (
                        <li key={`${e.id}${e.spentOn}`} className="flex items-baseline justify-between gap-3 py-2 text-base">
                          <span className="min-w-0 truncate">
                            {e.description || "Sem descrição"}{" "}
                            <span className="text-sm text-neutral-500">
                              · {new Date(`${e.spentOn}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                            </span>
                          </span>
                          <span className="tabular-nums">{formatBRL(e.amountCents)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
