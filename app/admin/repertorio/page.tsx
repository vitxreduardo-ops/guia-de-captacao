import { Rss, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AtualizarAgora } from "@/components/admin/repertorio/AtualizarAgora";
import { Destaques } from "@/components/admin/repertorio/Destaques";
import { NoticiaItem } from "@/components/admin/repertorio/NoticiaItem";
import { listFontes, listNoticias, temasDe } from "@/lib/repertorio";
import { semanaAtual, ultimoDestaque } from "@/lib/repertorioDestaques";
import { getCurrentSession } from "@/lib/session";
import {
  VISOES,
  VISAO_ROTULO,
  agruparPorDia,
  diaDe,
  haQuanto,
  lerPagina,
  lerVisao,
  rotuloDoDia,
} from "@/lib/repertorioTypes";

export const dynamic = "force-dynamic";
// Vale para as server actions da página: "Atualizar agora" busca todos os feeds.
export const maxDuration = 60;

const um = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : undefined);

const ABA =
  "shrink-0 rounded-sm border-b-2 px-1 pb-2 text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

export default async function RepertorioPage({ searchParams }: PageProps<"/admin/repertorio">) {
  const params = await searchParams;
  const fontes = await listFontes();
  const temas = temasDe(fontes);
  const pedido = um(params.tema);
  const tema = pedido && temas.includes(pedido) ? pedido : undefined;
  const visao = lerVisao(params.ver);
  const busca = (um(params.q) ?? "").trim().slice(0, 100);
  const pagina = lerPagina(params.pagina);

  // Destaques só na abertura de um tema: com filtro ou busca, a pessoa já
  // está procurando outra coisa e o resumo empurraria a lista pra baixo.
  const comDestaques = Boolean(tema) && visao === "todas" && !busca && pagina === 1;
  const [{ noticias, temMais }, destaque] = await Promise.all([
    listNoticias({ tema, visao, busca, pagina }),
    comDestaques && tema
      ? ultimoDestaque(tema).catch((err) => {
          // Sem a migração 0099 a lista continua funcionando, só sem resumo.
          console.error(err);
          return undefined;
        })
      : undefined,
  ]);

  // O atalho só aparece pra quem enxerga Roteiros; pros outros, ia dar em /admin.
  const session = await getCurrentSession();
  const podeRoteiro =
    session !== null &&
    (session.role === "admin" || session.allowedSections === null || session.allowedSections.includes("roteiros"));

  const ativas = fontes.filter((f) => f.ativa);
  const ultimaColeta = ativas
    .map((f) => f.ultima_coleta_em)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  const comErro = ativas.filter((f) => f.ultimo_erro).length;
  const hoje = diaDe(new Date().toISOString());

  /** Link mantendo o filtro atual e trocando só o que mudou. Página volta pra 1. */
  function link(mudanca: { tema?: string | null; ver?: string | null; q?: string | null; pagina?: number }) {
    const valores: Record<string, string | undefined> = {
      tema: mudanca.tema === null ? undefined : (mudanca.tema ?? tema),
      ver: mudanca.ver === null ? undefined : (mudanca.ver ?? (visao === "todas" ? undefined : visao)),
      q: mudanca.q === null ? undefined : (mudanca.q ?? (busca || undefined)),
      pagina: mudanca.pagina && mudanca.pagina > 1 ? String(mudanca.pagina) : undefined,
    };
    const query = new URLSearchParams();
    for (const [chave, valor] of Object.entries(valores)) if (valor) query.set(chave, valor);
    const texto = query.toString();
    return texto ? `/admin/repertorio?${texto}` : "/admin/repertorio";
  }

  const filtrando = Boolean(busca) || visao !== "todas";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-10">
      <AdminHeader title="Repertório" trail={[{ label: "Admin", href: "/admin" }, { label: "Repertório" }]} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="max-w-[60ch] text-[13px] text-neutral-500">
            O que saiu nos portais que a gente acompanha, separado por tema. É pra ler e montar
            repertório; guarde o que quiser achar de novo.
          </p>
          <p className="text-xs text-neutral-400">
            {ultimaColeta ? `Atualizado ${haQuanto(ultimaColeta)}` : "Ainda sem coleta"} ·{" "}
            {ativas.length === 1 ? "1 fonte" : `${ativas.length} fontes`}
            {comErro ? (
              <>
                {" · "}
                <Link href="/admin/repertorio/fontes" className="text-amber-700 underline-offset-2 hover:underline">
                  {comErro === 1 ? "1 fonte com erro" : `${comErro} fontes com erro`}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Link
            href="/admin/repertorio/fontes"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none sm:min-h-0 sm:py-1.5"
          >
            <Rss className="size-4" aria-hidden />
            Fontes
          </Link>
          <AtualizarAgora />
        </div>
      </div>

      {temas.length > 1 ? (
        <nav aria-label="Temas" className="mb-4 flex gap-4 overflow-x-auto border-b border-neutral-200">
          {[undefined, ...temas].map((item) => {
            const atual = item === tema;
            return (
              <Link
                key={item ?? "tudo"}
                href={link({ tema: item ?? null })}
                aria-current={atual ? "page" : undefined}
                className={`${ABA} ${
                  atual
                    ? "border-neutral-900 font-medium text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {item ?? "Tudo"}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Mostrar" className="flex rounded-md border border-neutral-200 p-0.5">
          {VISOES.map((item) => {
            const atual = item === visao;
            return (
              <Link
                key={item}
                href={link({ ver: item === "todas" ? null : item })}
                aria-current={atual ? "true" : undefined}
                className={`rounded px-2.5 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none ${
                  atual ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {VISAO_ROTULO[item]}
              </Link>
            );
          })}
        </div>

        <form action="/admin/repertorio" method="get" role="search" className="flex min-w-0 flex-1 items-center gap-1">
          {tema ? <input type="hidden" name="tema" value={tema} /> : null}
          {visao !== "todas" ? <input type="hidden" name="ver" value={visao} /> : null}
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar no Repertório</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              id="repertorio-busca"
              type="search"
              name="q"
              defaultValue={busca}
              placeholder="Buscar por palavra no título ou resumo"
              className="w-full rounded-md border border-neutral-300 py-2 pr-3 pl-8 text-base focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none sm:py-1.5 sm:text-sm"
            />
          </label>
        </form>
      </div>

      {comDestaques && tema && destaque !== undefined ? (
        <div className="mt-3">
          <Destaques key={tema} tema={tema} inicial={destaque} semanaAtual={semanaAtual()} />
        </div>
      ) : null}

      {noticias.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          {ativas.length === 0 ? (
            <>
              Nenhuma fonte ativa.{" "}
              <Link href="/admin/repertorio/fontes" className="underline underline-offset-2">
                Cadastre um feed em Fontes
              </Link>
              .
            </>
          ) : filtrando ? (
            "Nada encontrado com esse filtro."
          ) : pagina > 1 ? (
            "Não há notícias mais antigas."
          ) : (
            "Ainda não há notícias. Use “Atualizar agora” para buscar as primeiras."
          )}
        </p>
      ) : (
        <div className="divide-y divide-neutral-200">
          {agruparPorDia(noticias).map((grupo) => (
            <section key={grupo.dia} aria-labelledby={`dia-${grupo.dia}`} className="pt-4">
              <h2
                id={`dia-${grupo.dia}`}
                className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase"
              >
                {rotuloDoDia(grupo.dia, hoje)}
              </h2>
              <ul className="divide-y divide-neutral-100">
                {grupo.noticias.map((noticia) => (
                  <li key={noticia.id}>
                    <NoticiaItem
                      noticia={noticia}
                      mostrarTema={!tema && temas.length > 1}
                      acoes={
                        podeRoteiro ? (
                          <Link
                            href={`/admin/roteiros?noticia=${noticia.id}`}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none sm:min-h-0 sm:py-1"
                          >
                            <ScrollText className="size-4" aria-hidden />
                            Gerar roteiro
                          </Link>
                        ) : null
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {pagina > 1 || temMais ? (
        <nav aria-label="Páginas" className="mt-6 flex justify-between gap-2 text-sm">
          {pagina > 1 ? (
            <Link href={link({ pagina: pagina - 1 })} className="rounded-md px-2 py-1.5 text-neutral-600 hover:bg-neutral-100">
              ← Mais recentes
            </Link>
          ) : (
            <span />
          )}
          {temMais ? (
            <Link href={link({ pagina: pagina + 1 })} className="rounded-md px-2 py-1.5 text-neutral-600 hover:bg-neutral-100">
              Mais antigas →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
