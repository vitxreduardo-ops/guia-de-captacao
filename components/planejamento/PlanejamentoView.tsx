"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { marcarPassoAction } from "@/app/planejamento/[slug]/actions";
import {
  chaveMarcacao,
  diasNoMes,
  passosDa,
  type Entrega,
  type PassoId,
  type PlanejamentoContent,
} from "@/lib/planejamentoTypes";
import st from "./planejamento.module.css";

/*
 * Leis de UX (lawsofux.com) que guiam esta tela:
 * - Hick / Miller: 2 abas; a agenda mostra uma semana por vez (até ~4 entregas).
 * - Fitts: tudo que se toca tem 48px ou mais e fica na metade de baixo.
 * - Goal-gradient / Zeigarnik: barra "x de y prontas" e selo "Atrasado".
 * - Von Restorff: só a próxima entrega é escura.
 * - Jakob: abas embaixo e "voltar" no topo, como nos apps que o cliente usa.
 * - Chunking: cada entrega abre numa página com tudo dela, em blocos curtos.
 */

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WDL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const TIPO = { feed: "Feed", stories: "Stories", reels: "Reel" } as const;
const ouvirHash = (avisar: () => void) => {
  window.addEventListener("hashchange", avisar);
  return () => window.removeEventListener("hashchange", avisar);
};
const nada = () => () => {};
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Chev() {
  return (
    <svg className={st.chev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [estado, setEstado] = useState<"" | "ok" | "sel">("");
  return (
    <button
      type="button"
      className={`${st.copy} ${estado === "ok" ? st.copyOk : ""}`}
      onClick={async (e) => {
        try {
          await navigator.clipboard.writeText(texto);
          setEstado("ok");
        } catch {
          // Navegador recusou: seleciona o texto pra pessoa copiar na mão.
          const alvo = e.currentTarget.previousElementSibling;
          if (alvo) {
            const r = document.createRange();
            r.selectNodeContents(alvo);
            const s = getSelection();
            s?.removeAllRanges();
            s?.addRange(r);
          }
          setEstado("sel");
        }
        setTimeout(() => setEstado(""), 1800);
      }}
    >
      {estado === "ok" ? "Copiado ✓" : estado === "sel" ? "Texto selecionado" : rotulo}
    </button>
  );
}

export function PlanejamentoView({
  slug,
  clientName,
  content: c,
  marcadas: inicial,
}: {
  slug: string;
  clientName: string;
  content: PlanejamentoContent;
  marcadas: string[];
}) {
  const [marcadas, setMarcadas] = useState(() => new Set(inicial));
  // A página aberta mora no endereço (#semana-2, #e5, #estrategia): voltar do
  // celular funciona e dá pra mandar o link de uma entrega.
  const rota = useSyncExternalStore(ouvirHash, () => window.location.hash.slice(1).toLowerCase().replace(/\/$/, ""), () => "");
  // Data só no navegador: o servidor não sabe o fuso de quem abre.
  const diaHoje = useSyncExternalStore(nada, () => new Date().toDateString(), () => "");
  const hoje = diaHoje ? new Date(diaHoje) : null;
  // Posição de rolagem de cada tela da agenda: voltar da entrega cai onde a pessoa estava.
  const posicoes = useRef(new Map<string, number>());
  const rotaDaRolagem = useRef(rota);
  useLayoutEffect(() => {
    rotaDaRolagem.current = rota;
    window.scrollTo(0, /^(e|dia-)\d+$/.test(rota) ? 0 : (posicoes.current.get(rota) ?? 0));
    const guardar = () => posicoes.current.set(rotaDaRolagem.current, window.scrollY);
    window.addEventListener("scroll", guardar, { passive: true });
    return () => window.removeEventListener("scroll", guardar);
  }, [rota]);
  // Dia tocado no calendário: o roteiro aparece embaixo dele, sem sair da tela.
  // undefined = ninguém tocou ainda (já abre a próxima entrega); null = fechado de propósito.
  const [diaSel, setDiaSel] = useState<number | null | undefined>(undefined);
  const previaRef = useRef<HTMLElement>(null);
  const [erro, setErro] = useState("");
  const [, startTransition] = useTransition();

  const E = c.entregas;
  const data = (dia: number) => new Date(c.ano, c.mes - 1, dia);
  const feito = (e: Entrega, p: PassoId) => marcadas.has(chaveMarcacao(e.id, p));
  const completo = (e: Entrega) => passosDa(e).every((p) => feito(e, p.id));
  const atrasado = (e: Entrega) => !!hoje && data(e.dia) < hoje && !completo(e);

  const semanas = c.semanas.length
    ? c.semanas
    : [...new Set(E.map((e) => e.semana))].map((n) => {
        const dias = E.filter((e) => e.semana === n).map((e) => e.dia);
        return { numero: n, inicio: Math.min(...dias), fim: Math.max(...dias), tema: "", objetivo: "" };
      });

  const mDia = rota.match(/^dia-(\d+)$/);
  const mPost = rota.match(/^(e\d+)$/);
  // Links antigos (#e5) abrem o dia da entrega.
  const diaDoLink = mDia ? Number(mDia[1]) : mPost ? E.find((e) => e.id === mPost[1])?.dia : undefined;
  // Dia que não existe no mês cai na agenda em vez de uma tela vazia.
  const diaAberto = diaDoLink !== undefined && diaDoLink >= 1 && diaDoLink <= diasNoMes(c.ano, c.mes) ? diaDoLink : undefined;
  const aba = rota === "estrategia" ? "estrategia" : "agenda";

  function ir(h: string) {
    if (window.location.hash.slice(1) !== h) {
      history.pushState(null, "", `#${h}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function marcar(e: Entrega, p: PassoId, valor: boolean) {
    const k = chaveMarcacao(e.id, p);
    const aplicar = (v: boolean) =>
      setMarcadas((atual) => {
        const n = new Set(atual);
        if (v) n.add(k);
        else n.delete(k);
        return n;
      });
    aplicar(valor);
    setErro("");
    startTransition(async () => {
      const r = await marcarPassoAction(slug, e.id, p, valor).catch(() => ({ ok: false }));
      if (!r.ok) {
        aplicar(!valor);
        setErro("Não consegui salvar. Confira a internet e toque de novo.");
        setTimeout(() => setErro(""), 6000);
      }
    });
  }

  function checks(e: Entrega, onde: string) {
    return (
      <>
        {passosDa(e).map((p) => {
          const id = `c-${onde}-${e.id}-${p.id}`;
          return (
            <label key={p.id} className={st.check} htmlFor={id}>
              <input id={id} type="checkbox" checked={feito(e, p.id)} onChange={(ev) => marcar(e, p.id, ev.target.checked)} />
              {p.label}
            </label>
          );
        })}
      </>
    );
  }

  function pills(e: Entrega) {
    return (
      <span className={st.chips}>
        <span className={`${st.pill} ${e.tipo !== "stories" ? st.pillFeed : ""}`}>{TIPO[e.tipo]}</span>
        {completo(e) ? <span className={`${st.pill} ${st.pillOk}`}>Pronto</span> : atrasado(e) ? <span className={`${st.pill} ${st.pillLate}`}>Atrasado</span> : null}
        {e.marco ? <span className={`${st.pill} ${st.pillTag}`}>{e.marco}</span> : null}
      </span>
    );
  }

  const prontas = E.filter(completo).length;
  const totalPassos = E.reduce((t, e) => t + passosDa(e).length, 0);
  const passosFeitos = E.reduce((t, e) => t + passosDa(e).filter((p) => feito(e, p.id)).length, 0);

  const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const proxima = hoje ? E.find((e) => atrasado(e)) ?? E.find((e) => data(e.dia) >= hoje && !completo(e)) : undefined;
  const diaPrev = diaSel === undefined ? (proxima?.dia ?? null) : diaSel;
  // Prazo em palavras: "hoje", "amanhã", "em 3 dias" (um limite concreto pesa mais que uma data).
  const quando = (d: number) => {
    if (!hoje) return "";
    const n = Math.round((+data(d) - +hoje) / 86400000);
    return n === 0 ? "hoje" : n === 1 ? "amanhã" : n > 1 ? `em ${n} dias` : n === -1 ? "ontem" : `há ${-n} dias`;
  };
  const emAndamento = (e: Entrega) => !completo(e) && passosDa(e).some((p) => feito(e, p.id));

  function escolherDia(d: number) {
    // Tocar de novo no mesmo dia fecha o cartão.
    if (d === diaPrev) return setDiaSel(null);
    setDiaSel(d);
    const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => previaRef.current?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "nearest" }));
  }

  function agenda() {
    const diasComPost = [...new Set(E.map((e) => e.dia))];
    const celulas: (number | null)[] = Array(data(1).getDay()).fill(null);
    for (let d = 1; d <= diasNoMes(c.ano, c.mes); d++) celulas.push(d);

    return (
      <div className={st.agenda}>
        <header className={st.top}>
          <span className={st.eyebrow}>Planejamento · Tatu Estúdio Criativo</span>
          <h1>
            {MESES[c.mes - 1][0].toUpperCase() + MESES[c.mes - 1].slice(1)}, {clientName}
          </h1>
          <div className={st.progress}>
            <div className={st.bar} role="progressbar" aria-label="Entregas prontas" aria-valuemin={0} aria-valuemax={E.length} aria-valuenow={prontas}>
              <i style={{ width: `${totalPassos ? (passosFeitos / totalPassos) * 100 : 0}%` }} />
            </div>
            <span>{E.length > 0 && prontas === E.length ? "Tudo pronto ✓" : `${prontas} de ${E.length} prontas`}</span>
          </div>
        </header>

        <section className={st.cal} aria-label={`Calendário de ${MESES[c.mes - 1]}`}>
          <div className={st.calHead} aria-hidden>
            {SEMANA.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <div className={st.calGrid}>
            {celulas.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />;
              const ps = E.filter((e) => e.dia === d);
              const ehHoje = !!hoje && +data(d) === +hoje;
              const miolo = (
                <>
                  <b>{d}</b>
                  <span className={st.pips}>
                    {ps.map((e) => (
                      <i key={e.id} className={`${st.pip} ${completo(e) ? st.pipOk : atrasado(e) ? st.pipLate : emAndamento(e) ? st.pipParcial : e.tipo !== "stories" ? st.pipFeed : ""}`} />
                    ))}
                  </span>
                </>
              );
              const cls = `${st.cd} ${ps.length ? st.cdOn : ""} ${ehHoje ? st.cdHoje : ""} ${d === diaPrev ? st.cdSel : ""}`;
              return ps.length ? (
                <button key={d} type="button" className={cls} aria-pressed={d === diaPrev} aria-label={`${WDL[data(d).getDay()]} ${d}: ${ps.map((e) => `${TIPO[e.tipo]} ${e.titulo}`).join(", ")}`} onClick={() => escolherDia(d)}>
                  {miolo}
                </button>
              ) : (
                <span key={d} className={cls}>
                  {miolo}
                </span>
              );
            })}
          </div>
          <p className={st.legenda}>
            <span><i className={`${st.pip} ${st.pipFeed}`} /> Feed ou Reel</span>
            <span><i className={st.pip} /> Stories</span>
            <span><i className={`${st.pip} ${st.pipParcial}`} /> Em andamento</span>
            <span><i className={`${st.pip} ${st.pipOk}`} /> Pronto</span>
          </p>
        </section>

        {/* Moldura de tamanho fixo: todos os dias ficam empilhados na mesma célula e só um aparece.
            A altura é a do maior dia, então trocar de data nunca mexe no resto da tela. */}
        <section ref={previaRef} className={st.slot} aria-live="polite">
          {diasComPost.map((d) => {
            const ativo = d === diaPrev;
            const doDia = E.filter((e) => e.dia === d);
            const nome = WDL[data(d).getDay()];
            const ehProxima = !!proxima && proxima.dia === d;
            const quando_ = quando(d);
            const rotulo = [ehProxima ? `${atrasado(proxima) ? "Ficou pra trás" : "Próxima entrega"} · ${WD[data(d).getDay()]}, ${d}/${c.mes}` : `${nome[0].toUpperCase() + nome.slice(1)}, ${d} de ${MESES[c.mes - 1]}`, quando_].filter(Boolean).join(" · ");
            return (
              <div key={d} className={`${st.block} ${st.previa} ${doDia.length > 1 ? st.multi : ""} ${ativo ? st.on : ""}`} inert={!ativo} aria-hidden={!ativo}>
                <span className={st.eyebrow}>{rotulo}</span>
                {doDia.map((e) => (
                  <div key={e.id} className={st.previaItem}>
                    {pills(e)}
                    <h2>{e.titulo}</h2>
                    {e.formato ? <p className={st.dmeta}>{e.formato}</p> : null}
                    {e.fala ? (
                      <p className={`${st.speech} ${doDia.length > 1 ? st.clamp2 : st.clamp}`}>{e.fala}</p>
                    ) : e.telas.length ? (
                      <>
                        <ol className={st.screens}>
                          {e.telas.slice(0, doDia.length > 1 ? 1 : 3).map((t, n) => (
                            <li key={n}>
                              <span>{t}</span>
                            </li>
                          ))}
                        </ol>
                        {e.telas.length > (doDia.length > 1 ? 1 : 3) ? <p className={st.note}>+ {e.telas.length - (doDia.length > 1 ? 1 : 3)} no dia completo</p> : null}
                      </>
                    ) : e.card ? (
                      <p className={st.cardtext}>{e.card}</p>
                    ) : (
                      <p className={st.note}>Roteiro completo na página do dia.</p>
                    )}
                  </div>
                ))}
                <button type="button" className={st.abrir} onClick={() => ir(`dia-${d}`)}>
                  Abrir o dia completo →
                </button>
              </div>
            );
          })}
          <div className={`${st.vazioCard} ${!diaPrev ? st.on : ""}`} inert={!!diaPrev} aria-hidden={!!diaPrev}>
            Toque num dia do calendário para ver o roteiro aqui.
          </div>
        </section>

        {c.avisos.length ? (
          <details className={`${st.block} ${st.fold} ${st.combinados}`}>
            <summary>
              <h2>Combinados do mês</h2>
              <Chev />
            </summary>
            {c.avisos.map((a) => (
              <p key={a} className={st.note}>
                {a}
              </p>
            ))}
          </details>
        ) : null}
      </div>
    );
  }

  function corpo(e: Entrega, T: "h1" | "h2") {
    const w = semanas.find((x) => x.numero === e.semana);
    // Sem repetir quando o objetivo da semana já começa pela linha de conteúdo.
    const objetivo = w?.objetivo ?? "";
    const porque = e.porque
      ? e.porque
      : e.linha && !sem(objetivo).startsWith(sem(e.linha))
        ? `${e.linha}. ${objetivo}`.trim()
        : objetivo || e.linha;
    return (
      <>
        <div className={st.dhead}>
          {pills(e)}
          <T>{e.titulo}</T>
          {e.formato ? <p className={st.dmeta}>{e.formato}</p> : null}
        </div>
        {porque ? (
          <div className={st.why}>
            <span className={st.eyebrow}>Por que esse conteúdo</span>
            <p>{porque}</p>
          </div>
        ) : null}
        <div className={st.steps} style={{ padding: 0 }}>
          {checks(e, "d")}
        </div>
        {e.detalhes.length ? (
          <section className={st.block}>
            <h2>Combinado pra esta entrega</h2>
            <dl className={st.dl}>
              {e.detalhes.map((d) => (
                <div key={d.rotulo}>
                  <dt>{d.rotulo}</dt>
                  <dd>{d.texto}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {e.card ? (
          <section className={st.block}>
            <h2>Texto do card</h2>
            <div className={st.cardtext}>{e.card}</div>
          </section>
        ) : null}
        {e.fala ? (
          <section className={st.block}>
            <h2>{e.telas.length ? "Opção 1 · você falando pra câmera" : "Fala pra câmera"}</h2>
            <p className={st.sub}>Leia com calma e grave do seu jeito.</p>
            <div className={st.speech}>{e.fala}</div>
            <Copiar texto={e.fala} rotulo="Copiar fala" />
          </section>
        ) : null}
        {e.telas.length ? (
          <section className={st.block}>
            <h2>{e.fala ? "Opção 2 · texto sobre vídeo ou foto" : "Telas"}</h2>
            <p className={st.sub}>Uma tela por vez, na ordem.</p>
            <ol className={st.screens}>
              {e.telas.map((t, n) => (
                <li key={n}>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {e.comoFazer.length ? (
          <section className={st.block}>
            <h2>Como fazer</h2>
            <ul>
              {e.comoFazer.map((t, n) => (
                <li key={n}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {e.legenda ? (
          <section className={st.block}>
            <h2>Legenda</h2>
            <p className={st.sub}>Pronta pra colar no Instagram.</p>
            <div className={st.speech}>{e.legenda}</div>
            <Copiar texto={e.legenda} rotulo="Copiar legenda" />
          </section>
        ) : null}
        {e.referencias.length ? (
          <section className={st.block}>
            <h2>{e.referencias.length > 1 ? "Referências" : "Referência"}</h2>
            {e.referencias.map((r) => (
              <a key={r.url} className={st.ref} href={r.url} target="_blank" rel="noopener noreferrer">
                <span>{r.titulo || r.url}</span>
                <Chev />
              </a>
            ))}
          </section>
        ) : null}
        {e.observacao ? <p className={st.note}>{e.observacao}</p> : null}
        <div className={st.steps} style={{ padding: 0 }}>
          {checks(e, "f")}
        </div>
      </>
    );
  }

  // Tela do dia: tudo o que há pra fazer naquela data, uma entrega embaixo da outra.
  function detalhe(dia: number) {
    const es = E.filter((e) => e.dia === dia);
    const diasComPost = [...new Set(E.map((e) => e.dia))];
    const k = diasComPost.indexOf(dia);
    const ant = diasComPost[k - 1];
    const prox = diasComPost[k + 1];
    const nome = WDL[data(dia).getDay()];
    const rotuloDia = (d: number) => `${WD[data(d).getDay()]}, ${d}`;
    return (
      <div className={st.detail}>
        <button type="button" className={st.back} onClick={() => ir("agenda")}>
          ← Calendário
        </button>
        {es.length === 0 ? (
          <div className={st.dhead}>
            <h1 className={st.dataDia}>{nome[0].toUpperCase() + nome.slice(1)}, {dia} de {MESES[c.mes - 1]}</h1>
            <p className={st.note}>Sem postagem neste dia.</p>
          </div>
        ) : es.length === 1 ? (
          <>
            <p className={st.dataDia}>
              {nome[0].toUpperCase() + nome.slice(1)}, {dia} de {MESES[c.mes - 1]}
            </p>
            {corpo(es[0], "h1")}
          </>
        ) : (
          <>
            <div className={st.dhead}>
              <span className={st.eyebrow}>{es.length} entregas neste dia</span>
              <h1 className={st.dataDia}>
                {nome[0].toUpperCase() + nome.slice(1)}, {dia} de {MESES[c.mes - 1]}
              </h1>
            </div>
            {es.map((e) => (
              <section key={e.id} className={st.entrega}>
                {corpo(e, "h2")}
              </section>
            ))}
          </>
        )}
        {es.length > 0 && es.every(completo) ? (
          <p className={st.feito} role="status">
            Tudo pronto neste dia ✓
          </p>
        ) : null}
        <div className={st.pager}>
          <button type="button" disabled={ant === undefined} onClick={() => ant !== undefined && ir(`dia-${ant}`)}>
            Anterior<b>{ant !== undefined ? rotuloDia(ant) : ""}</b>
          </button>
          <button type="button" className={st.nx} disabled={prox === undefined} onClick={() => prox !== undefined && ir(`dia-${prox}`)}>
            Próxima<b>{prox !== undefined ? rotuloDia(prox) : ""}</b>
          </button>
        </div>
      </div>
    );
  }

  // Mural em colunas, como o Pinterest: todos os cartões com a mesma largura e o mesmo estilo,
  // alturas livres, sem buracos. Tudo aberto: toda informação aqui é importante.
  function estrategia() {
    const lista = (itens: string[]) => (
      <ul>
        {itens.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    );
    const cartoes: { titulo: string; corpo: React.ReactNode }[] = [];
    if (c.comQuemFalamos) cartoes.push({ titulo: "Com quem a gente fala", corpo: <p>{c.comQuemFalamos}</p> });
    if (c.rotina.length)
      cartoes.push({
        titulo: "Sua semana",
        corpo: (
          <div className={st.rotina}>
            {c.rotina.map((r) => (
              <div key={r.dia} className={`${st.rd} ${r.tipo === "feed" ? st.rdFeed : r.tipo === "livre" || r.tipo === "plantao" ? st.rdOff : ""}`}>
                <b>{r.dia}</b>
                <span>{r.texto}</span>
              </div>
            ))}
          </div>
        ),
      });
    if (c.comoFunciona.length) cartoes.push({ titulo: "Como funciona", corpo: lista(c.comoFunciona) });
    if (c.linhas.length)
      cartoes.push({
        titulo: "Sobre o que a gente fala",
        corpo: (
          <div className={st.lines}>
            {c.linhas.map((l) => (
              <div key={l.titulo} className={st.line}>
                <b>{l.titulo}</b>
                {l.descricao ? <p>{l.descricao}</p> : null}
              </div>
            ))}
          </div>
        ),
      });
    if (c.tomDeVoz.length) cartoes.push({ titulo: "Tom de voz", corpo: lista(c.tomDeVoz) });
    if (c.regras.length) cartoes.push({ titulo: "Regras de conteúdo", corpo: lista(c.regras) });

    return (
      <div className={st.strat}>
        <header className={st.top}>
          <span className={st.eyebrow}>Estratégia do mês</span>
          <h1>O plano de {MESES[c.mes - 1]}</h1>
        </header>
        {c.resumo ? <p className={st.lead}>{c.resumo}</p> : null}
        {c.fatos.length ? (
          <div className={st.facts}>
            {c.fatos.map((f) => (
              <span key={f} className={st.fact}>
                {f}
              </span>
            ))}
          </div>
        ) : null}
        <div className={st.mural}>
          {cartoes.map((k) => (
            <section key={k.titulo} className={`${st.block} ${st.cartao}`}>
              <h2>{k.titulo}</h2>
              {k.corpo}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={st.root}>
      <main className={st.app}>
        {E.length === 0 ? (
          <p className={st.empty}>Este planejamento ainda está sendo preparado.</p>
        ) : diaAberto ? (
          detalhe(diaAberto)
        ) : aba === "estrategia" ? (
          estrategia()
        ) : (
          agenda()
        )}
      </main>
      {erro ? (
        <p role="alert" className={st.erro}>
          {erro}
        </p>
      ) : null}
      <nav className={st.tabs} aria-label="Seções">
        <div>
          <button type="button" aria-current={aba === "agenda" && !diaAberto ? "page" : undefined} onClick={() => ir("agenda")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Agenda
          </button>
          <button type="button" aria-current={aba === "estrategia" ? "page" : undefined} onClick={() => ir("estrategia")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z" />
            </svg>
            Estratégia
          </button>
        </div>
      </nav>
    </div>
  );
}
