/**
 * Planejamento mensal do cliente. A unidade é a ENTREGA (um post ou um dia de
 * stories): cada uma traz tudo o que o cliente precisa pra fazer só ela.
 * O jsonb vem da IA ou do banco e passa sempre por parseContent.
 */

export type TipoEntrega = "feed" | "stories";

export interface Referencia {
  titulo: string;
  url: string;
}

export interface Entrega {
  /** Estável pela ordem: "e0", "e1"… É a chave das marcações. */
  id: string;
  dia: number;
  semana: number;
  tipo: TipoEntrega;
  titulo: string;
  /** Nome curto, pros botões de anterior/próxima. */
  curto: string;
  linha: string;
  formato: string;
  /** Data comemorativa ou aviso do dia (ex.: "Dia Mundial da DPOC"). */
  marco: string;
  card: string;
  fala: string;
  telas: string[];
  comoFazer: string[];
  legenda: string;
  observacao: string;
  referencias: Referencia[];
}

export interface Semana {
  numero: number;
  inicio: number;
  fim: number;
  tema: string;
  objetivo: string;
}

export type TipoRotina = "livre" | "stories" | "feed" | "plantao";

export interface PlanejamentoContent {
  ano: number;
  /** 1 a 12. */
  mes: number;
  resumo: string;
  fatos: string[];
  comQuemFalamos: string;
  comoFunciona: string[];
  regras: string[];
  tomDeVoz: string[];
  linhas: { titulo: string; descricao: string }[];
  rotina: { dia: string; texto: string; tipo: TipoRotina }[];
  avisos: string[];
  semanas: Semana[];
  entregas: Entrega[];
}

export type PassoId = "g" | "p";
export interface Passo {
  id: PassoId;
  label: string;
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : Number.parseInt(s(v), 10) || 0);
const objs = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
const strs = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const http = (u: string) => /^https?:\/\//i.test(u);

export const diasNoMes = (ano: number, mes: number) => new Date(ano, mes, 0).getDate();

/**
 * Normaliza o conteúdo. `fallback` dá mês e ano quando a IA não mandar
 * (ou quando o registro é do formato antigo, de 5 abas).
 */
export function parseContent(raw: unknown, fallback: Date): PlanejamentoContent {
  const c = obj(raw);
  const mesIa = n(c.mes);
  const anoIa = n(c.ano);
  const ok = mesIa >= 1 && mesIa <= 12 && anoIa >= 2000;
  const ano = ok ? anoIa : fallback.getFullYear();
  const mes = ok ? mesIa : fallback.getMonth() + 1;
  const ultimo = diasNoMes(ano, mes);

  const semanas: Semana[] = objs(c.semanas)
    .map((w, i) => ({
      numero: n(w.numero) || i + 1,
      inicio: Math.max(1, n(w.inicio)),
      fim: Math.min(ultimo, n(w.fim) || ultimo),
      tema: s(w.tema),
      objetivo: s(w.objetivo),
    }))
    .filter((w) => w.inicio <= w.fim)
    .sort((a, b) => a.inicio - b.inicio)
    .map((w, i) => ({ ...w, numero: i + 1 }));

  const semanaDoDia = (dia: number) => {
    const w = semanas.find((x) => dia >= x.inicio && dia <= x.fim);
    if (w) return w.numero;
    // Sem semanas da IA: semana de calendário (seg→dom) dentro do mês.
    const primeiro = (new Date(ano, mes - 1, 1).getDay() + 6) % 7;
    return Math.floor((dia - 1 + primeiro) / 7) + 1;
  };

  const entregas: Entrega[] = objs(c.entregas)
    .map((e) => {
      const dia = n(e.dia);
      const titulo = s(e.titulo);
      return {
        id: "",
        dia,
        semana: semanaDoDia(dia),
        tipo: (s(e.tipo).toLowerCase() === "feed" ? "feed" : "stories") as TipoEntrega,
        titulo,
        curto: s(e.curto) || titulo,
        linha: s(e.linha),
        formato: s(e.formato),
        marco: s(e.marco),
        card: s(e.card),
        fala: s(e.fala),
        telas: strs(e.telas),
        comoFazer: strs(e.comoFazer),
        legenda: s(e.legenda),
        observacao: s(e.observacao),
        referencias: objs(e.referencias)
          .map((r) => ({ titulo: s(r.titulo), url: s(r.url) }))
          .filter((r) => http(r.url)),
      };
    })
    .filter((e) => e.titulo && e.dia >= 1 && e.dia <= ultimo)
    // sort estável: mesma data mantém a ordem que veio
    .sort((a, b) => a.dia - b.dia)
    .map((e, i) => ({ ...e, id: `e${i}` }));

  const tipos: TipoRotina[] = ["livre", "stories", "feed", "plantao"];
  return {
    ano,
    mes,
    resumo: s(c.resumo),
    fatos: strs(c.fatos),
    comQuemFalamos: s(c.comQuemFalamos),
    comoFunciona: strs(c.comoFunciona),
    regras: strs(c.regras),
    tomDeVoz: strs(c.tomDeVoz),
    linhas: objs(c.linhas).map((l) => ({ titulo: s(l.titulo), descricao: s(l.descricao) })).filter((l) => l.titulo),
    rotina: objs(c.rotina)
      .map((r) => {
        const tipo = s(r.tipo).toLowerCase() as TipoRotina;
        return { dia: s(r.dia), texto: s(r.texto), tipo: tipos.includes(tipo) ? tipo : "livre" };
      })
      .filter((r) => r.dia),
    avisos: strs(c.avisos),
    semanas,
    entregas,
  };
}

/** O que o cliente marca em cada entrega. Regra fixa, não vem da IA. */
export function passosDa(e: Entrega): Passo[] {
  if (e.tipo === "stories") {
    return [{ id: "g", label: e.fala || e.telas.length ? "Gravei" : "Fotografei" }, { id: "p", label: "Postei" }];
  }
  if (/carrossel/i.test(e.formato)) return [{ id: "g", label: "Separei as fotos" }, { id: "p", label: "Postei" }];
  return [{ id: "g", label: "Revisei a legenda" }, { id: "p", label: "Postei" }];
}

export const chaveMarcacao = (entregaId: string, passo: PassoId) => `${entregaId}:${passo}`;
