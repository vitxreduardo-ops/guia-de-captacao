"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition, type ElementType } from "react";
import { editarCampoAction, marcarPassoAction, type RespostaEdicao } from "@/app/planejamento/[slug]/actions";
import { aplicarEdicao } from "@/lib/planejamentoEdit";
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
// Em tela larga (desktop, iPad deitado) o dia completo abre em modal; no resto, em página.
const LARGO = "(min-width: 1000px)";
const ouvirLargura = (avisar: () => void) => {
  const m = matchMedia(LARGO);
  m.addEventListener("change", avisar);
  return () => m.removeEventListener("change", avisar);
};
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Chev() {
  return (
    <svg className={st.chev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

type Gravar = (caminho: string[], valor: string) => Promise<boolean>;

// Hora do último Esc que só cancelou uma edição: o modal ignora o Esc que vem junto.
let escDeCampo = 0;

/**
 * Texto que a equipe edita ali mesmo. Fora do modo edição é só o texto, no mesmo
 * elemento de sempre. No modo edição ganha contorno tracejado; ao tocar, o texto
 * vira um campo com a MESMA fonte e o mesmo tamanho (nada se mexe). Salva ao sair
 * do campo; Esc cancela; Enter salva (em texto longo, Ctrl/Cmd+Enter). Se o
 * servidor recusar, o que foi digitado continua no campo.
 */
function Ed({
  as: Tag = "span",
  caminho,
  valor,
  editando,
  gravar,
  multi = false,
  className = "",
}: {
  as?: ElementType;
  caminho: string[];
  valor: string;
  editando: boolean;
  gravar: Gravar;
  multi?: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [rasc, setRasc] = useState(valor);
  const cancelou = useRef(false);

  if (!editando) return <Tag className={className}>{valor}</Tag>;

  function abrir() {
    cancelou.current = false;
    setRasc(valor);
    setAberto(true);
  }

  async function confirmar() {
    if (cancelou.current) return;
    if (rasc.trim() === valor.trim()) return setAberto(false);
    if (await gravar(caminho, rasc)) setAberto(false);
  }

  if (!aberto) {
    return (
      <Tag
        className={`${className} ${st.ed}`}
        tabIndex={0}
        title="Clique para editar"
        onClick={abrir}
        onKeyDown={(ev: React.KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            abrir();
          }
        }}
      >
        {valor}
      </Tag>
    );
  }
  return (
    <Tag className={`${className} ${st.ed} ${st.edAberto}`}>
      {/* A cópia invisível do texto (data-v) dá a altura, igual à do texto original; o campo fica por cima. */}
      <span className={st.edBase} data-v={rasc}>
        <textarea
          className={st.edCampo}
          value={rasc}
          rows={1}
          autoFocus
          onChange={(ev) => setRasc(ev.target.value)}
          onBlur={confirmar}
          onKeyDown={(ev) => {
            if (ev.key === "Escape") {
              ev.preventDefault();
              ev.stopPropagation();
              escDeCampo = Date.now(); // o modal não fecha junto
              cancelou.current = true;
              setAberto(false);
            } else if (ev.key === "Enter" && (!multi || ev.metaKey || ev.ctrlKey)) {
              ev.preventDefault();
              ev.currentTarget.blur();
            }
          }}
        />
      </span>
    </Tag>
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
  content: conteudoInicial,
  marcadas: inicial,
  podeEditar = false,
  salvarCampo,
}: {
  slug: string;
  clientName: string;
  content: PlanejamentoContent;
  marcadas: string[];
  /** Só a equipe: liga o botão de editar o texto na própria página. */
  podeEditar?: boolean;
  /** Troca a gravação (testes e pré-visualização); por padrão grava pelo servidor. */
  salvarCampo?: (caminho: string[], valor: string) => Promise<RespostaEdicao>;
}) {
  // O conteúdo vira estado: a edição aparece na hora e desfaz se o servidor recusar.
  const [c, setC] = useState(conteudoInicial);
  const cRef = useRef(c);
  useLayoutEffect(() => {
    cRef.current = c;
  });
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "salvando" | "salvo" | "erro"; msg: string; desfazer?: () => void } | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editavel = podeEditar && editando;
  const [marcadas, setMarcadas] = useState(() => new Set(inicial));
  // A página aberta mora no endereço (#semana-2, #e5, #estrategia): voltar do
  // celular funciona e dá pra mandar o link de uma entrega.
  const rota = useSyncExternalStore(ouvirHash, () => window.location.hash.slice(1).toLowerCase().replace(/\/$/, ""), () => "");
  // Data só no navegador: o servidor não sabe o fuso de quem abre.
  const diaHoje = useSyncExternalStore(nada, () => new Date().toDateString(), () => "");
  const hoje = diaHoje ? new Date(diaHoje) : null;
  // Posição de rolagem de cada tela da agenda: voltar da entrega cai onde a pessoa estava.
  const largo = useSyncExternalStore(ouvirLargura, () => matchMedia(LARGO).matches, () => false);
  const posicoes = useRef(new Map<string, number>());
  // Em tela larga o dia é um modal por cima da agenda: para a rolagem, continua sendo a "agenda".
  const chave = largo && /^(e|dia-)\d+$/.test(rota) ? "agenda" : rota;
  const rotaDaRolagem = useRef(chave);
  useLayoutEffect(() => {
    rotaDaRolagem.current = chave;
    window.scrollTo(0, /^(e|dia-)\d+$/.test(chave) ? 0 : (posicoes.current.get(chave) ?? 0));
    const guardar = () => posicoes.current.set(rotaDaRolagem.current, window.scrollY);
    window.addEventListener("scroll", guardar, { passive: true });
    return () => window.removeEventListener("scroll", guardar);
  }, [chave]);
  // Dia tocado no calendário: o roteiro aparece embaixo dele, sem sair da tela.
  // undefined = ninguém tocou ainda (já abre a próxima entrega); null = fechado de propósito.
  const [diaSel, setDiaSel] = useState<number | null | undefined>(undefined);
  const previaRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
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

  // O <dialog> nativo cuida de foco, Esc e do fundo inerte; só espelhamos o endereço nele.
  useEffect(() => {
    const d = modalRef.current;
    if (!d) return;
    if (largo && diaAberto !== undefined) {
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [largo, diaAberto]);

  function ir(h: string) {
    if (window.location.hash.slice(1) !== h) {
      history.pushState(null, "", `#${h}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function mostrar(a: NonNullable<typeof aviso>) {
    clearTimeout(timerAviso.current);
    setAviso(a);
    if (a.tipo !== "salvando") timerAviso.current = setTimeout(() => setAviso(null), a.tipo === "erro" ? 7000 : 6000);
  }

  // Grava um texto: mostra na hora, confirma no servidor e desfaz se ele recusar.
  async function gravar(caminho: string[], valor: string): Promise<boolean> {
    const r = aplicarEdicao(cRef.current, caminho, valor);
    if (!r.ok) {
      mostrar({ tipo: "erro", msg: r.erro });
      return false;
    }
    setC(r.content);
    cRef.current = r.content;
    mostrar({ tipo: "salvando", msg: "Salvando…" });
    const grava = salvarCampo ?? ((cam: string[], v: string) => editarCampoAction(slug, cam, v));
    const resp: RespostaEdicao = await grava(caminho, valor).catch(() => ({ ok: false as const, erro: "Sem conexão. Toque de novo para tentar." }));
    if (!resp.ok) {
      const volta = aplicarEdicao(cRef.current, caminho, r.anterior);
      if (volta.ok) {
        setC(volta.content);
        cRef.current = volta.content;
      }
      mostrar({ tipo: "erro", msg: resp.erro });
      return false;
    }
    mostrar({ tipo: "salvo", msg: "Salvo ✓", desfazer: () => void gravar(caminho, r.anterior) });
    return true;
  }
  const edp = { editando: editavel, gravar };
  // O modal fica na camada de cima do navegador: o aviso precisa estar dentro dele pra aparecer.
  const avisoEl = aviso ? (
    <div role={aviso.tipo === "erro" ? "alert" : "status"} className={`${st.aviso} ${aviso.tipo === "erro" ? st.avisoErro : ""}`}>
      <span>{aviso.msg}</span>
      {aviso.desfazer ? (
        <button type="button" onClick={() => aviso.desfazer?.()}>
          Desfazer
        </button>
      ) : null}
    </div>
  ) : null;
  const pe = (e: Entrega, ...r: (string | number)[]) => ["e", e.id, ...r.map(String)];
  const pc = (...r: (string | number)[]) => ["s", ...r.map(String)];

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
                      <p className={st.speech}>
                        <span className={doDia.length > 1 ? st.clamp2 : st.clamp}>{e.fala}</span>
                      </p>
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
                      <p className={st.cardtext}>
                        <span className={st.clamp3}>{e.card}</span>
                      </p>
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
            {c.avisos.map((a, i) => (
              <Ed key={i} {...edp} as="p" className={st.note} caminho={pc("avisos", i)} valor={a} multi />
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
          <Ed {...edp} as={T} caminho={pe(e, "titulo")} valor={e.titulo} />
          {e.formato ? <Ed {...edp} as="p" className={st.dmeta} caminho={pe(e, "formato")} valor={e.formato} /> : null}
        </div>
        {porque ? (
          <div className={st.why}>
            <span className={st.eyebrow}>Por que esse conteúdo</span>
            <Ed {...edp} as="p" caminho={pe(e, "porque")} valor={porque} multi />
          </div>
        ) : null}
        <div className={st.steps} style={{ padding: 0 }}>
          {checks(e, "d")}
        </div>
        {e.detalhes.length ? (
          <section className={st.block}>
            <h2>Combinado pra esta entrega</h2>
            <dl className={st.dl}>
              {e.detalhes.map((d, i) => (
                <div key={i}>
                  <Ed {...edp} as="dt" caminho={pe(e, "detalhes", i, "rotulo")} valor={d.rotulo} />
                  <Ed {...edp} as="dd" caminho={pe(e, "detalhes", i, "texto")} valor={d.texto} multi />
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {e.card ? (
          <section className={st.block}>
            <h2>Texto do card</h2>
            <Ed {...edp} as="div" className={st.cardtext} caminho={pe(e, "card")} valor={e.card} multi />
          </section>
        ) : null}
        {e.fala ? (
          <section className={st.block}>
            <h2>{e.telas.length ? "Opção 1 · você falando pra câmera" : "Fala pra câmera"}</h2>
            <p className={st.sub}>Leia com calma e grave do seu jeito.</p>
            <Ed {...edp} as="div" className={st.speech} caminho={pe(e, "fala")} valor={e.fala} multi />
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
                  <Ed {...edp} caminho={pe(e, "telas", n)} valor={t} />
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
                <li key={n}>
                  <Ed {...edp} caminho={pe(e, "comoFazer", n)} valor={t} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {e.legenda ? (
          <section className={st.block}>
            <h2>Legenda</h2>
            <p className={st.sub}>Pronta pra colar no Instagram.</p>
            <Ed {...edp} as="div" className={st.speech} caminho={pe(e, "legenda")} valor={e.legenda} multi />
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
        {e.observacao ? <Ed {...edp} as="p" className={st.note} caminho={pe(e, "observacao")} valor={e.observacao} multi /> : null}
        <div className={st.steps} style={{ padding: 0 }}>
          {checks(e, "f")}
        </div>
      </>
    );
  }

  // Tudo o que há pra fazer naquela data, uma entrega embaixo da outra.
  // Serve à página (celular/iPad) e ao modal (desktop).
  function conteudoDia(dia: number) {
    const es = E.filter((e) => e.dia === dia);
    const diasComPost = [...new Set(E.map((e) => e.dia))];
    const k = diasComPost.indexOf(dia);
    const ant = diasComPost[k - 1];
    const prox = diasComPost[k + 1];
    const nome = WDL[data(dia).getDay()];
    const rotuloDia = (d: number) => `${WD[data(d).getDay()]}, ${d}`;
    return (
      <>
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
      </>
    );
  }

  function detalhe(dia: number) {
    return (
      <div className={st.detail}>
        <button type="button" className={st.back} onClick={() => ir("agenda")}>
          ← Calendário
        </button>
        {conteudoDia(dia)}
      </div>
    );
  }

  // Mural em colunas, como o Pinterest: todos os cartões com a mesma largura e o mesmo estilo,
  // alturas livres, sem buracos. Tudo aberto: toda informação aqui é importante.
  function estrategia() {
    const lista = (nome: string, itens: string[]) => (
      <ul>
        {itens.map((t, i) => (
          <li key={i}>
            <Ed {...edp} caminho={pc(nome, i)} valor={t} />
          </li>
        ))}
      </ul>
    );
    const cartoes: { titulo: string; corpo: React.ReactNode }[] = [];
    if (c.comQuemFalamos) cartoes.push({ titulo: "Com quem a gente fala", corpo: <Ed {...edp} as="p" caminho={pc("comQuemFalamos")} valor={c.comQuemFalamos} multi /> });
    if (c.rotina.length)
      cartoes.push({
        titulo: "Sua semana",
        corpo: (
          <div className={st.rotina}>
            {c.rotina.map((r, i) => (
              <div key={r.dia} className={`${st.rd} ${r.tipo === "feed" ? st.rdFeed : r.tipo === "livre" || r.tipo === "plantao" ? st.rdOff : ""}`}>
                <b>{r.dia}</b>
                <Ed {...edp} caminho={pc("rotina", i, "texto")} valor={r.texto} />
              </div>
            ))}
          </div>
        ),
      });
    if (c.comoFunciona.length) cartoes.push({ titulo: "Como funciona", corpo: lista("comoFunciona", c.comoFunciona) });
    if (c.linhas.length)
      cartoes.push({
        titulo: "Sobre o que a gente fala",
        corpo: (
          <div className={st.lines}>
            {c.linhas.map((l, i) => (
              <div key={i} className={st.line}>
                <Ed {...edp} as="b" caminho={pc("linhas", i, "titulo")} valor={l.titulo} />
                {l.descricao ? <Ed {...edp} as="p" caminho={pc("linhas", i, "descricao")} valor={l.descricao} multi /> : null}
              </div>
            ))}
          </div>
        ),
      });
    if (c.tomDeVoz.length) cartoes.push({ titulo: "Tom de voz", corpo: lista("tomDeVoz", c.tomDeVoz) });
    if (c.regras.length) cartoes.push({ titulo: "Regras de conteúdo", corpo: lista("regras", c.regras) });

    return (
      <div className={st.strat}>
        <header className={st.top}>
          <span className={st.eyebrow}>Estratégia do mês</span>
          <h1>O plano de {MESES[c.mes - 1]}</h1>
        </header>
        {c.resumo ? <Ed {...edp} as="p" className={st.lead} caminho={pc("resumo")} valor={c.resumo} multi /> : null}
        {c.fatos.length ? (
          <div className={st.facts}>
            {c.fatos.map((f, i) => (
              <Ed key={i} {...edp} className={st.fact} caminho={pc("fatos", i)} valor={f} />
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
        ) : diaAberto && !largo ? (
          detalhe(diaAberto)
        ) : aba === "estrategia" ? (
          estrategia()
        ) : (
          agenda()
        )}
      </main>
      {largo && E.length > 0 ? (
        <dialog
          ref={modalRef}
          className={st.modal}
          aria-label={diaAberto ? `Dia ${diaAberto} de ${MESES[c.mes - 1]}` : "Dia"}
          onCancel={(ev) => {
            if (Date.now() - escDeCampo < 400) ev.preventDefault();
          }}
          onClose={() => {
            // Esc e o botão fechar voltam pra agenda; o botão "voltar" do navegador também.
            if (/^(e|dia-)\d+$/.test(window.location.hash.slice(1).toLowerCase())) ir("agenda");
          }}
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) ev.currentTarget.close();
          }}
        >
          {diaAberto ? (
            <div className={st.modalCorpo}>
              {/* Barra de altura zero: os botões ficam por cima, sem empurrar o conteúdo. */}
              <div className={st.barraModal}>
                {podeEditar ? (
                  <button type="button" className={`${st.editarModal} ${editando ? st.editarLigado : ""}`} aria-pressed={editando} onClick={() => setEditando((v) => !v)}>
                    {editando ? "Concluir edição" : "Editar"}
                  </button>
                ) : null}
                <button type="button" className={st.fechar} aria-label="Fechar" onClick={() => modalRef.current?.close()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {avisoEl}
              <div className={st.detail}>{conteudoDia(diaAberto)}</div>
            </div>
          ) : null}
        </dialog>
      ) : null}
      {podeEditar ? (
        <button type="button" className={`${st.editar} ${editando ? st.editarLigado : ""}`} aria-pressed={editando} onClick={() => setEditando((v) => !v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
          {editando ? "Concluir edição" : "Editar"}
        </button>
      ) : null}
      {!(largo && diaAberto) ? avisoEl : null}
      {erro ? (
        <p role="alert" className={st.erro}>
          {erro}
        </p>
      ) : null}
      <nav className={st.tabs} aria-label="Seções">
        <div>
          <button type="button" aria-current={aba === "agenda" && (!diaAberto || largo) ? "page" : undefined} onClick={() => ir("agenda")}>
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
