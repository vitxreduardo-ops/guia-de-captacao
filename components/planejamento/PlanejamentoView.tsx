"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { marcarPassoAction } from "@/app/planejamento/[slug]/actions";
import {
  chaveMarcacao,
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
const TIPO = { feed: "Feed", stories: "Stories" } as const;
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
  const rota = useSyncExternalStore(ouvirHash, () => window.location.hash.slice(1), () => "");
  // Data só no navegador: o servidor não sabe o fuso de quem abre.
  const diaHoje = useSyncExternalStore(nada, () => new Date().toDateString(), () => "");
  const hoje = diaHoje ? new Date(diaHoje) : null;
  const [erro, setErro] = useState("");
  const [, startTransition] = useTransition();

  const E = c.entregas;
  const data = (dia: number) => new Date(c.ano, c.mes - 1, dia);
  const feito = (e: Entrega, p: PassoId) => marcadas.has(chaveMarcacao(e.id, p));
  const completo = (e: Entrega) => passosDa(e).every((p) => feito(e, p.id));
  const atrasado = (e: Entrega) => !!hoje && data(e.dia) < hoje && !completo(e);

  // Dias de plantão vêm da rotina ("Qui" → quinta).
  const plantao = new Set(
    c.rotina.filter((r) => r.tipo === "plantao").map((r) => WD.findIndex((w) => sem(w) === sem(r.dia).slice(0, 3))),
  );

  const semanas = c.semanas.length
    ? c.semanas
    : [...new Set(E.map((e) => e.semana))].map((n) => {
        const dias = E.filter((e) => e.semana === n).map((e) => e.dia);
        return { numero: n, inicio: Math.min(...dias), fim: Math.max(...dias), tema: "", objetivo: "" };
      });

  const mesDeHoje = hoje && hoje.getFullYear() === c.ano && hoje.getMonth() === c.mes - 1;
  const semanaDeHoje = mesDeHoje ? semanas.find((w) => hoje!.getDate() >= w.inicio && hoje!.getDate() <= w.fim)?.numero : undefined;
  const mSem = rota.match(/^semana-(\d+)$/);
  const mPost = rota.match(/^(e\d+)$/);
  const entrega = mPost ? E.find((e) => e.id === mPost[1]) : undefined;
  const semanaAtual = (mSem ? Number(mSem[1]) : entrega?.semana) ?? semanaDeHoje ?? semanas[0]?.numero ?? 1;
  const aba = rota === "estrategia" ? "estrategia" : "agenda";

  function ir(h: string) {
    if (window.location.hash.slice(1) !== h) {
      history.pushState(null, "", `#${h}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    window.scrollTo(0, 0);
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
        <span className={`${st.pill} ${e.tipo === "feed" ? st.pillFeed : ""}`}>{TIPO[e.tipo]}</span>
        {completo(e) ? <span className={`${st.pill} ${st.pillOk}`}>Pronto</span> : atrasado(e) ? <span className={`${st.pill} ${st.pillLate}`}>Atrasado</span> : null}
        {e.marco ? <span className={`${st.pill} ${st.pillTag}`}>{e.marco}</span> : null}
      </span>
    );
  }

  const prontas = E.filter(completo).length;
  const totalPassos = E.reduce((t, e) => t + passosDa(e).length, 0);
  const passosFeitos = E.reduce((t, e) => t + passosDa(e).filter((p) => feito(e, p.id)).length, 0);

  function agenda() {
    const w = semanas.find((x) => x.numero === semanaAtual) ?? semanas[0];
    const daSemana = E.filter((e) => e.semana === w?.numero);
    const proxima = hoje ? E.find((e) => atrasado(e)) ?? E.find((e) => data(e.dia) >= hoje && !completo(e)) : undefined;

    // Faixa seg→dom cobrindo a semana inteira (pode passar de 7 dias).
    const dias: (number | null)[] = [];
    if (w) {
      const recuo = (data(w.inicio).getDay() + 6) % 7;
      for (let i = 0; i < recuo; i++) dias.push(null);
      for (let d = w.inicio; d <= w.fim; d++) dias.push(d);
      while (dias.length % 7) dias.push(null);
    }

    return (
      <>
        <header className={st.top}>
          <span className={st.eyebrow}>Planejamento · Tatu Estúdio Criativo</span>
          <h1>
            {MESES[c.mes - 1][0].toUpperCase() + MESES[c.mes - 1].slice(1)}, {clientName}
          </h1>
          <div className={st.progress}>
            <div className={st.bar} role="progressbar" aria-label="Entregas prontas" aria-valuemin={0} aria-valuemax={E.length} aria-valuenow={prontas}>
              <i style={{ width: `${totalPassos ? (passosFeitos / totalPassos) * 100 : 0}%` }} />
            </div>
            <span>
              {prontas} de {E.length} prontas
            </span>
          </div>
        </header>

        {proxima ? (
          <button type="button" className={st.next} onClick={() => ir(proxima.id)}>
            <span className={st.eyebrow}>
              {atrasado(proxima) ? "Ficou pra trás" : "Próxima entrega"} · {WDL[data(proxima.dia).getDay()]}, {proxima.dia}/{c.mes}
            </span>
            <h2>{proxima.titulo}</h2>
            <span className={st.go}>
              {TIPO[proxima.tipo]}
              <span>Abrir →</span>
            </span>
          </button>
        ) : null}

        <div className={st.weeks} role="group" aria-label="Semanas">
          {semanas.map((x) => {
            const tudo = E.filter((e) => e.semana === x.numero).every(completo);
            return (
              <button key={x.numero} type="button" className={st.wk} aria-pressed={x.numero === w?.numero} onClick={() => ir(`semana-${x.numero}`)}>
                <b>
                  Semana {x.numero}
                  {tudo ? <i className={st.dot} aria-label="concluída" /> : null}
                </b>
                <small>
                  {x.inicio} a {x.fim}/{c.mes}
                </small>
              </button>
            );
          })}
        </div>

        {w?.tema || w?.objetivo ? (
          <div className={st.whead}>
            <span className={st.eyebrow}>Tema da semana</span>
            {w.tema ? <h2>{w.tema}</h2> : null}
            {w.objetivo ? <p>{w.objetivo}</p> : null}
          </div>
        ) : (
          <div className={st.whead} />
        )}

        <div className={st.days}>
          {dias.map((d, i) => {
            if (d === null) return <div key={`b${i}`} className={`${st.day} ${st.dayBlank}`} aria-hidden />;
            const dt = data(d);
            const ps = E.filter((e) => e.dia === d);
            const cls = [st.day, plantao.has(dt.getDay()) ? st.dayShift : "", hoje && +dt === +hoje ? st.dayToday : "", ps.length ? "" : st.dayOff].join(" ");
            const rotulo = `${WDL[dt.getDay()]} ${d}: ${ps.length ? ps.map((e) => `${TIPO[e.tipo]} ${e.titulo}`).join(", ") : plantao.has(dt.getDay()) ? "plantão" : "sem postagem"}`;
            const miolo = (
              <>
                <small>{WD[dt.getDay()]}</small>
                <b>{d}</b>
                <span className={st.pips}>
                  {ps.map((e) => (
                    <i key={e.id} className={`${st.pip} ${completo(e) ? st.pipOk : e.tipo === "feed" ? st.pipFeed : ""}`} />
                  ))}
                </span>
              </>
            );
            return ps.length ? (
              <button
                key={d}
                type="button"
                className={cls}
                aria-label={rotulo}
                onClick={() => document.getElementById(`dia-${d}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
              >
                {miolo}
              </button>
            ) : (
              <div key={d} className={cls} aria-label={rotulo}>
                {miolo}
              </div>
            );
          })}
        </div>

        {w?.numero === semanas[0]?.numero && c.avisos.length ? (
          <div className={st.list} style={{ marginBottom: 12 }}>
            {c.avisos.map((a) => (
              <p key={a} className={st.note}>
                {a}
              </p>
            ))}
          </div>
        ) : null}

        <div className={st.list}>
          {daSemana.length === 0 ? <p className={st.note}>Nenhuma postagem nesta semana.</p> : null}
          {daSemana.map((e, i) => (
            <article key={e.id} id={daSemana.findIndex((x) => x.dia === e.dia) === i ? `dia-${e.dia}` : undefined} className={`${st.card} ${completo(e) ? st.cardDone : ""}`}>
              <button type="button" className={st.open} onClick={() => ir(e.id)}>
                <span className={st.when}>
                  <b>{e.dia}</b>
                  <small>{WD[data(e.dia).getDay()]}</small>
                </span>
                <span className={st.what}>
                  {pills(e)}
                  <h3>{e.titulo}</h3>
                </span>
                <Chev />
              </button>
              <div className={st.steps}>
                {checks(e, "l")}
              </div>
            </article>
          ))}
        </div>
      </>
    );
  }

  function detalhe(e: Entrega) {
    const w = semanas.find((x) => x.numero === e.semana);
    const i = E.indexOf(e);
    const ant = E[i - 1];
    const prox = E[i + 1];
    const dia = WDL[data(e.dia).getDay()];
    // Sem repetir quando o objetivo da semana já começa pela linha de conteúdo.
    const objetivo = w?.objetivo ?? "";
    const porque = e.linha && !sem(objetivo).startsWith(sem(e.linha)) ? `${e.linha}. ${objetivo}`.trim() : objetivo || e.linha;
    return (
      <div className={st.detail}>
        <button type="button" className={st.back} onClick={() => ir(`semana-${e.semana}`)}>
          ← Semana {e.semana}
        </button>
        <div className={st.dhead}>
          {pills(e)}
          <h1>{e.titulo}</h1>
          <p className={st.dmeta}>
            {dia[0].toUpperCase() + dia.slice(1)}, {e.dia} de {MESES[c.mes - 1]}
            {e.formato ? ` · ${e.formato}` : ""}
          </p>
        </div>
        {porque ? (
          <div className={st.why}>
            <span className={st.eyebrow}>Por que esse conteúdo</span>
            <p>{porque}</p>
          </div>
        ) : null}
        <div className={st.dsteps}>
          {checks(e, "d")}
        </div>
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
        <div className={st.pager}>
          <button type="button" disabled={!ant} onClick={() => ant && ir(ant.id)}>
            Anterior<b>{ant?.curto}</b>
          </button>
          <button type="button" className={st.nx} disabled={!prox} onClick={() => prox && ir(prox.id)}>
            Próxima<b>{prox?.curto}</b>
          </button>
        </div>
      </div>
    );
  }

  function estrategia() {
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
        {c.comQuemFalamos ? (
          <section className={st.block}>
            <h2>Com quem a gente fala</h2>
            <p>{c.comQuemFalamos}</p>
          </section>
        ) : null}
        {c.rotina.length ? (
          <section className={st.block}>
            <h2>Sua semana</h2>
            <div className={st.rotina}>
              {c.rotina.map((r) => (
                <div key={r.dia} className={`${st.rd} ${r.tipo === "feed" ? st.rdFeed : r.tipo === "livre" || r.tipo === "plantao" ? st.rdOff : ""}`}>
                  <b>{r.dia}</b>
                  <span>{r.texto}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {c.comoFunciona.length ? (
          <section className={st.block}>
            <h2>Como funciona</h2>
            <ul>
              {c.comoFunciona.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {c.linhas.length ? (
          <section className={st.block}>
            <h2>Sobre o que a gente fala</h2>
            <div className={st.lines}>
              {c.linhas.map((l) => (
                <div key={l.titulo} className={st.line}>
                  <b>{l.titulo}</b>
                  {l.descricao ? <p>{l.descricao}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {[
          ["Tom de voz", c.tomDeVoz],
          ["Regras de conteúdo", c.regras],
        ].map(([titulo, itens]) =>
          (itens as string[]).length ? (
            <details key={titulo as string} className={`${st.block} ${st.fold}`}>
              <summary>
                <h2>{titulo as string}</h2>
                <Chev />
              </summary>
              <ul>
                {(itens as string[]).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </details>
          ) : null,
        )}
      </div>
    );
  }

  return (
    <div className={st.root}>
      <main className={st.app}>
        {E.length === 0 ? (
          <p className={st.empty}>Este planejamento ainda está sendo preparado.</p>
        ) : entrega ? (
          detalhe(entrega)
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
          <button type="button" aria-current={aba === "agenda" && !entrega ? "page" : undefined} onClick={() => ir(`semana-${semanaAtual}`)}>
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
