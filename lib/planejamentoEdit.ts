import type { CampoTexto, PlanejamentoContent } from "@/lib/planejamentoTypes";

/**
 * Edição de texto direto na página do planejamento. Sem `server-only` de
 * propósito: o servidor valida e grava, e o navegador usa a mesma função pra
 * mostrar a mudança na hora (e desfazer se o servidor recusar).
 *
 * O caminho é uma lista fixa, nunca um caminho livre no JSON:
 *   ["e", idDaEntrega, "fala"]                    campo da entrega
 *   ["e", idDaEntrega, "telas", "2"]              item de lista da entrega
 *   ["e", idDaEntrega, "detalhes", "0", "texto"]  detalhe / referência
 *   ["s", "resumo"] · ["s", "fatos", "1"]         estratégia
 *   ["s", "linhas", "0", "titulo"] · ["s", "rotina", "0", "texto"]
 * Tipo, dia, id e rascunhos nunca entram: mexem na estrutura, não no texto.
 */
export type Caminho = string[];

export type ResultadoEdicao =
  | { ok: true; content: PlanejamentoContent; valor: string; anterior: string }
  | { ok: false; erro: string };

export const MAX_TEXTO = 4000;

const CAMPOS_ENTREGA = ["titulo", "formato", "marco", "porque", "card", "fala", "legenda", "observacao"];
const LISTAS_ENTREGA = ["telas", "comoFazer"];
const TEXTOS_ESTRATEGIA = ["resumo", "comQuemFalamos"];
const LISTAS_ESTRATEGIA = ["fatos", "comoFunciona", "regras", "tomDeVoz", "avisos"];
const RASCUNHO: string[] = ["fala", "legenda", "card"];

type Alvo = {
  /** Objeto (ou lista) onde o texto mora e a chave dentro dele. */
  dono: Record<string, unknown> | unknown[];
  chave: string | number;
  obrigatorio: boolean;
  link?: boolean;
  /** Campo que a IA pode ter rascunhado: revisar tira a marca. */
  campo?: string;
};

const indice = (lista: unknown[] | undefined, texto: string | undefined): number | null => {
  if (!lista || texto === undefined || !/^\d+$/.test(texto)) return null;
  const n = Number(texto);
  return n < lista.length ? n : null;
};

function resolver(c: PlanejamentoContent, caminho: Caminho): { alvo: Alvo; entregaId?: string } | null {
  const [raiz, ...r] = caminho;

  if (raiz === "e") {
    const [id, ...resto] = r;
    const e = c.entregas.find((x) => x.id === id);
    if (!e) return null;
    const dono = e as unknown as Record<string, unknown>;

    if (resto.length === 1 && CAMPOS_ENTREGA.includes(resto[0])) {
      return { alvo: { dono, chave: resto[0], obrigatorio: resto[0] === "titulo", campo: resto[0] }, entregaId: e.id };
    }
    if (resto.length === 2 && LISTAS_ENTREGA.includes(resto[0])) {
      const lista = dono[resto[0]] as unknown[];
      const i = indice(lista, resto[1]);
      return i === null ? null : { alvo: { dono: lista, chave: i, obrigatorio: true }, entregaId: e.id };
    }
    if (resto.length === 3 && resto[0] === "detalhes" && ["rotulo", "texto"].includes(resto[2])) {
      const i = indice(e.detalhes, resto[1]);
      return i === null ? null : { alvo: { dono: e.detalhes[i] as unknown as Record<string, unknown>, chave: resto[2], obrigatorio: true }, entregaId: e.id };
    }
    if (resto.length === 3 && resto[0] === "referencias" && ["titulo", "url"].includes(resto[2])) {
      const i = indice(e.referencias, resto[1]);
      if (i === null) return null;
      return {
        alvo: { dono: e.referencias[i] as unknown as Record<string, unknown>, chave: resto[2], obrigatorio: resto[2] === "url", link: resto[2] === "url" },
        entregaId: e.id,
      };
    }
    return null;
  }

  if (raiz === "s") {
    const dono = c as unknown as Record<string, unknown>;
    if (r.length === 1 && TEXTOS_ESTRATEGIA.includes(r[0])) return { alvo: { dono, chave: r[0], obrigatorio: false } };
    if (r.length === 2 && LISTAS_ESTRATEGIA.includes(r[0])) {
      const lista = dono[r[0]] as unknown[];
      const i = indice(lista, r[1]);
      return i === null ? null : { alvo: { dono: lista, chave: i, obrigatorio: true } };
    }
    if (r.length === 3 && r[0] === "linhas" && ["titulo", "descricao"].includes(r[2])) {
      const i = indice(c.linhas, r[1]);
      return i === null ? null : { alvo: { dono: c.linhas[i] as unknown as Record<string, unknown>, chave: r[2], obrigatorio: r[2] === "titulo" } };
    }
    if (r.length === 3 && r[0] === "rotina" && r[2] === "texto") {
      const i = indice(c.rotina, r[1]);
      return i === null ? null : { alvo: { dono: c.rotina[i] as unknown as Record<string, unknown>, chave: "texto", obrigatorio: true } };
    }
  }
  return null;
}

/** Aplica uma edição numa cópia do conteúdo. Nunca altera o objeto recebido. */
export function aplicarEdicao(content: PlanejamentoContent, caminho: Caminho, valor: string): ResultadoEdicao {
  const novo = structuredClone(content);
  const achado = resolver(novo, caminho);
  if (!achado) return { ok: false, erro: "Esse texto não pode ser editado." };

  const texto = String(valor).replace(/\r\n?/g, "\n").trim();
  const { alvo } = achado;
  if (texto.length > MAX_TEXTO) return { ok: false, erro: `Passou de ${MAX_TEXTO} caracteres.` };
  if (!texto && alvo.obrigatorio) return { ok: false, erro: "Esse campo não pode ficar vazio." };
  if (alvo.link && !/^https?:\/\/\S+$/i.test(texto)) return { ok: false, erro: "O link precisa começar com http:// ou https://." };

  const dono = alvo.dono as Record<string | number, unknown>;
  const anterior = typeof dono[alvo.chave] === "string" ? (dono[alvo.chave] as string) : "";
  dono[alvo.chave] = texto;

  // Revisado por uma pessoa: o cliente já pode ver (ver semRascunhos).
  if (achado.entregaId && alvo.campo && RASCUNHO.includes(alvo.campo) && texto) {
    const e = novo.entregas.find((x) => x.id === achado.entregaId)!;
    e.rascunhos = e.rascunhos.filter((c) => c !== (alvo.campo as CampoTexto));
  }
  return { ok: true, content: novo, valor: texto, anterior };
}
