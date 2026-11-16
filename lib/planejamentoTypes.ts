/**
 * Planejamento mensal do cliente. A unidade é a ENTREGA (um post ou um dia de
 * stories): cada uma traz tudo o que o cliente precisa pra fazer só ela.
 * O jsonb vem da IA ou do banco e passa sempre por parseContent.
 */

export type TipoEntrega = "feed" | "stories" | "reels";

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
  /** Por que esta entrega existe. Quando vazio, a tela usa o objetivo da semana. */
  porque: string;
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
  /** Campos extras do material (gancho, cenário, palavra-chave…), rotulados. */
  detalhes: { rotulo: string; texto: string }[];
  /** Campos escritos pela IA e ainda não revisados pela equipe. O cliente não os vê. */
  rascunhos: CampoTexto[];
}

export interface Semana {
  numero: number;
  inicio: number;
  fim: number;
  tema: string;
  objetivo: string;
}

/** Campos de texto que a equipe pode preencher quando o material não trouxe. */
export type CampoTexto = "fala" | "legenda" | "card";
const CAMPOS: CampoTexto[] = ["fala", "legenda", "card"];

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
        tipo: (["feed", "reels"].includes(s(e.tipo).toLowerCase()) ? s(e.tipo).toLowerCase() : "stories") as TipoEntrega,
        titulo,
        curto: s(e.curto) || titulo,
        linha: s(e.linha),
        porque: s(e.porque),
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
        rascunhos: strs(e.rascunhos).filter((c): c is CampoTexto => CAMPOS.includes(c as CampoTexto)),
        detalhes: objs(e.detalhes)
          .map((d) => ({ rotulo: s(d.rotulo), texto: s(d.texto) }))
          .filter((d) => d.rotulo && d.texto),
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
  if (e.tipo === "reels") return [{ id: "g", label: "Gravei" }, { id: "p", label: "Postei" }];
  if (e.tipo === "stories") {
    return [{ id: "g", label: e.fala || e.telas.length ? "Gravei" : "Fotografei" }, { id: "p", label: "Postei" }];
  }
  if (/carrossel/i.test(e.formato)) return [{ id: "g", label: "Separei as fotos" }, { id: "p", label: "Postei" }];
  return [{ id: "g", label: "Revisei a legenda" }, { id: "p", label: "Postei" }];
}

export const chaveMarcacao = (entregaId: string, passo: PassoId) => `${entregaId}:${passo}`;

export interface Lacuna {
  campo: CampoTexto;
  /** Como a equipe lê o campo ("Roteiro / fala pra câmera"). */
  rotulo: string;
  /** Já tem texto, mas foi escrito pela IA e espera revisão. */
  rascunho: boolean;
}

/**
 * O que esta entrega ainda precisa de texto. Regra fixa, sem IA: reel pede
 * fala e legenda; feed pede legenda (e o texto do card, se não for carrossel);
 * stories pedem alguma coisa pra dizer ou fazer.
 */
export function lacunasDa(e: Entrega): Lacuna[] {
  const pedidos: { campo: CampoTexto; rotulo: string }[] = [];
  if (e.tipo === "reels" && !e.fala && !e.telas.length) pedidos.push({ campo: "fala", rotulo: "Roteiro / fala pra câmera" });
  if (e.tipo !== "stories" && !e.legenda) pedidos.push({ campo: "legenda", rotulo: "Legenda" });
  if (e.tipo === "feed" && !e.card && !e.telas.length && !/carrossel/i.test(e.formato)) pedidos.push({ campo: "card", rotulo: "Texto do card" });
  if (e.tipo === "stories" && !e.fala && !e.telas.length && !e.comoFazer.length && !e.detalhes.length) pedidos.push({ campo: "fala", rotulo: "O que dizer ou mostrar" });
  const rascunhos: Lacuna[] = e.rascunhos
    .filter((c) => !pedidos.some((p) => p.campo === c))
    .map((campo) => ({ campo, rotulo: ROTULO[campo], rascunho: true }));
  return [...pedidos.map((p) => ({ ...p, rascunho: false })), ...rascunhos];
}

const ROTULO: Record<CampoTexto, string> = { fala: "Roteiro / fala pra câmera", legenda: "Legenda", card: "Texto do card" };

/** O que o cliente vê: campos em rascunho ficam vazios até a equipe revisar. */
export function semRascunhos(c: PlanejamentoContent): PlanejamentoContent {
  return {
    ...c,
    entregas: c.entregas.map((e) => (e.rascunhos.length ? { ...e, ...Object.fromEntries(e.rascunhos.map((k) => [k, ""])) } : e)),
  };
}
