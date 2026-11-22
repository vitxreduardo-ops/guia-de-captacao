import Link from "next/link";
import { headers } from "next/headers";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImportarPlanejamento } from "@/components/admin/ImportarPlanejamento";
import { LacunaPlanejamento } from "@/components/admin/LacunaPlanejamento";
import { listGalleryClients } from "@/lib/galleries";
import { listMarcacoes, listPlanejamentos } from "@/lib/planejamentos";
import { chaveMarcacao, lacunasDa, passosDa } from "@/lib/planejamentoTypes";
import { excluirPlanejamentoAction, publicarPlanejamentoAction } from "./actions";

export const dynamic = "force-dynamic";
// A leitura pela IA roda numa server action desta página.
export const maxDuration = 120;

export default async function PlanejamentosPage() {
  const [clientes, planejamentos, requestHeaders] = await Promise.all([
    listGalleryClients(),
    listPlanejamentos(),
    headers(),
  ]);

  const marcacoes = await listMarcacoes(planejamentos.map((p) => p.id));

  // Link pronto pra colar no WhatsApp: montado a partir do host do pedido.
  const origin = `https://${requestHeaders.get("host")}`.replace("https://localhost", "http://localhost");

  const porCliente = new Map<string, typeof planejamentos>();
  for (const p of planejamentos) {
    const nome = p.client_name ?? "Sem cliente";
    porCliente.set(nome, [...(porCliente.get(nome) ?? []), p]);
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <AdminHeader
        title="Planejamentos"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Planejamentos" }]}
      />

      <ImportarPlanejamento clientes={clientes.map((c) => ({ id: c.id, name: c.name }))} />

      {planejamentos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum planejamento ainda. Importe o primeiro acima.</p>
      ) : (
        [...porCliente.entries()].map(([nome, itens]) => (
          <section key={nome} className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-neutral-500">{nome}</h2>
            <ul className="space-y-3">
              {itens.map((p) => {
                const url = `${origin}/planejamento/${p.slug}`;
                const publicado = p.status === "published";
                const feitas = new Set(marcacoes.get(p.id) ?? []);
                const entregas = p.content.entregas.map((e) => ({
                  e,
                  passos: passosDa(e).map((ps) => ({ ...ps, feito: feitas.has(chaveMarcacao(e.id, ps.id)) })),
                }));
                const faltas = p.content.entregas.flatMap((e) => lacunasDa(e).map((l) => ({ e, l })));
                const prontas = entregas.filter((x) => x.passos.every((ps) => ps.feito)).length;
                return (
                  <li key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Link href={`/planejamento/${p.slug}`} target="_blank" className="font-medium text-neutral-900 hover:underline">
                          {p.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")} ·{" "}
                          <span className={publicado ? "text-emerald-600" : "text-amber-600"}>
                            {publicado ? "Publicado" : "Rascunho"}
                          </span>{" "}
                          ·{" "}
                          {entregas.length
                            ? `${prontas} de ${entregas.length} entregas prontas`
                            : "formato antigo: importe de novo"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {publicado ? <CopyLinkButton text={url} rotulo={`Planejamento · ${nome}`} /> : null}
                        <form action={publicarPlanejamentoAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value={publicado ? "draft" : "published"} />
                          <button type="submit" className="text-sm text-neutral-600 hover:text-neutral-900">
                            {publicado ? "Despublicar" : "Publicar"}
                          </button>
                        </form>
                        <form action={excluirPlanejamentoAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <DeleteButton confirmMessage={`Excluir "${p.title}" de ${nome}? Essa ação não pode ser desfeita.`} />
                        </form>
                      </div>
                    </div>
                    {faltas.length ? (
                      <details className="mt-3 border-t border-neutral-100 pt-3">
                        <summary className="cursor-pointer text-sm font-medium text-amber-700 hover:text-amber-800">
                          O que falta: {faltas.length} {faltas.length === 1 ? "texto" : "textos"} pra preencher
                        </summary>
                        <p className="mt-2 text-sm text-neutral-500">
                          O material não trouxe estes textos. Cole o que você tiver ou peça um rascunho à IA, que usa só o que o planejamento já diz.
                        </p>
                        <ul className="mt-3 space-y-5">
                          {faltas.map(({ e, l }) => (
                            <li key={`${e.id}-${l.campo}`}>
                              <p className="mb-1 text-xs text-neutral-500">
                                {String(e.dia).padStart(2, "0")}/{String(p.content.mes).padStart(2, "0")} · {e.titulo}
                              </p>
                              <LacunaPlanejamento
                                planejamentoId={p.id}
                                entregaId={e.id}
                                campo={l.campo}
                                rotulo={l.rotulo}
                                inicial={e[l.campo]}
                                rascunho={l.rascunho}
                              />
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    {entregas.length ? (
                      <details className="mt-3 border-t border-neutral-100 pt-3">
                        <summary className="cursor-pointer text-sm text-neutral-600 hover:text-neutral-900">
                          Ver o que {nome} já marcou
                        </summary>
                        <ul className="mt-2 divide-y divide-neutral-100 text-sm">
                          {entregas.map(({ e, passos }) => (
                            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                              <span className="w-12 tabular-nums text-neutral-500">
                                {String(e.dia).padStart(2, "0")}/{String(p.content.mes).padStart(2, "0")}
                              </span>
                              <span className="w-16 text-neutral-500">{e.tipo === "feed" ? "Feed" : e.tipo === "reels" ? "Reel" : "Stories"}</span>
                              <span className="min-w-0 flex-1 text-neutral-900">{e.titulo}</span>
                              {passos.map((ps) => (
                                <span
                                  key={ps.id}
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    ps.feito ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"
                                  }`}
                                >
                                  {ps.feito ? "✓ " : ""}
                                  {ps.label}
                                </span>
                              ))}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
