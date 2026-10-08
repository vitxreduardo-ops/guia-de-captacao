/**
 * O corpo do contrato com as variáveis trocadas.
 *
 * Fora de `contracts.ts` porque é conta pura: não toca banco, não é
 * `server-only`, e é o único pedaço do contrato onde dá pra errar em silêncio
 * — daí o teste em `tests/contractBody.test.ts`.
 */

export type ContractVars = {
  client_name: string;
  client_document: string;
  scope: string;
  price: number;
  payment_terms: string;
  start_date: string | null;
  duration_months: number | null;
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** `2026-09-20` vira `20/09/2026` sem passar por `Date`, que joga o dia pra
 *  trás quando o fuso do servidor é negativo. */
function formatDate(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

export function contractValues(vars: ContractVars): Record<string, string> {
  return {
    cliente: vars.client_name,
    documento: vars.client_document,
    escopo: vars.scope,
    valor: vars.price > 0 ? BRL.format(vars.price) : "",
    pagamento: vars.payment_terms,
    inicio: vars.start_date ? formatDate(vars.start_date) : "",
    meses: vars.duration_months ? String(vars.duration_months) : "",
  };
}

/**
 * Troca `{{nome}}` pelo valor correspondente.
 *
 * Campo ainda não preenchido devolve a própria variável, visível no texto. É
 * de propósito: apagado, o buraco passa batido e o contrato vai pro cliente
 * dizendo "pagará o valor de ." — com `{{valor}}` na tela, não passa.
 */
export function renderContractBody(body: string, vars: ContractVars): string {
  const valores = contractValues(vars);
  return applyToggles(body).replace(
    /\{\{(\w+)\}\}/g,
    (original, chave: string) => {
      const valor = valores[chave];
      return valor ? valor : original;
    },
  );
}

/** As variáveis citadas no corpo que ainda não têm valor. A tela usa pra
 *  avisar antes de publicar. */
export function missingContractVars(
  body: string,
  vars: ContractVars,
): string[] {
  const valores = contractValues(vars);
  const usadas = [...applyToggles(body).matchAll(/\{\{(\w+)\}\}/g)].map(
    (m) => m[1],
  );
  return [...new Set(usadas)].filter((chave) => !valores[chave]);
}

/**
 * Os parágrafos do corpo, na ordem.
 *
 * O `<textarea>` manda as quebras como `\r\n`, e aí não existem dois `\n`
 * seguidos: sem normalizar, o contrato inteiro vira um bloco só, com os `##`
 * e os `**` à mostra na página do cliente.
 */
export function contractBlocks(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean);
}

/**
 * Um bloco que é tabela: duas linhas ou mais, todas com colunas separadas por
 * ` | `. A primeira linha é o cabeçalho. Qualquer outra coisa devolve null e
 * segue como parágrafo — um texto com uma barra solta não vira tabela.
 */
// Célula vazia no fim da linha perde o espaço depois do `|` quando o bloco é
// aparado, então `A |` também é uma linha de duas colunas.
const SEPARADOR = / \| | \|$/;
const COLUNA = / \|(?: |$)/;

export function contractTable(bloco: string): string[][] | null {
  const linhas = bloco.split("\n");
  if (linhas.length < 2 || !linhas.every((l) => SEPARADOR.test(l))) {
    return null;
  }
  return linhas.map((l) => l.split(COLUNA).map((c) => c.trim()));
}

export type ContractClause = {
  /** `null` é o que vem antes do primeiro `##` (abertura sem título). */
  title: string | null;
  text: string;
};

/**
 * O corpo em cláusulas, uma por `##`, para a tela editar uma de cada vez.
 * O que vem antes do primeiro `##` vira uma cláusula sem título, para o texto
 * não se perder na ida e volta.
 */
export function splitClauses(body: string): ContractClause[] {
  const partes = body.replace(/\r\n/g, "\n").split(/^## /m);
  const abertura = partes.shift()?.trim() ?? "";
  const clausulas: ContractClause[] = partes.map((parte) => {
    const quebra = parte.indexOf("\n");
    const titulo = quebra === -1 ? parte : parte.slice(0, quebra);
    return {
      title: titulo.trim(),
      text: quebra === -1 ? "" : parte.slice(quebra + 1).trim(),
    };
  });
  return abertura ? [{ title: null, text: abertura }, ...clausulas] : clausulas;
}

/** O inverso de `splitClauses`: devolve o corpo em Markdown. */
export function joinClauses(clausulas: ContractClause[]): string {
  return clausulas
    .map((c) =>
      c.title === null
        ? c.text.trim()
        : `## ${c.title.trim()}${c.text.trim() ? `\n\n${c.text.trim()}` : ""}`,
    )
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Estrutura do contrato: cláusulas ligáveis, itens numerados e tabelas.
//
// O corpo continua sendo um texto Markdown só. Desligar uma cláusula ou um
// item põe `[[off]]` na frente dele em vez de apagar o texto, e é na hora de
// exibir (`applyToggles`) que o que está desligado some e a numeração fecha o
// buraco.

const OFF = "[[off]]";

export type ContractPiece =
  | { kind: "text"; text: string; num: string | null; off: boolean }
  | { kind: "table"; rows: string[][] }
  | { kind: "list"; items: string[] };

export type ContractClauseInput = {
  title: string | null;
  off: boolean;
  pieces: ContractPiece[];
};

/** `[[off]] Cláusula 3 — X` vira `{ off: true, title: "Cláusula 3 — X" }`. */
export function parseClauseTitle(raw: string | null): {
  title: string | null;
  off: boolean;
} {
  if (raw === null) return { title: null, off: false };
  const off = raw.startsWith(OFF);
  return { title: off ? raw.slice(OFF.length).trim() : raw, off };
}

export function clauseTitleText(title: string | null, off: boolean) {
  return title === null ? null : off ? `${OFF} ${title}` : title;
}

function parsePiece(bloco: string): ContractPiece {
  const tabela = contractTable(bloco);
  if (tabela) return { kind: "table", rows: tabela };

  const linhas = bloco.split("\n");
  if (linhas.every((l) => l.startsWith("- "))) {
    return { kind: "list", items: linhas.map((l) => l.slice(2)) };
  }

  const numerado = bloco.match(
    /^(\[\[off\]\]\s*)?(\d+\.\d+(?:\.\d+)?)\.\s+([\s\S]*)$/,
  );
  if (numerado) {
    return {
      kind: "text",
      num: numerado[2],
      off: Boolean(numerado[1]),
      text: numerado[3],
    };
  }
  return { kind: "text", num: null, off: false, text: bloco };
}

/** O texto de uma cláusula em peças: parágrafo, tabela ou lista. */
export function parsePieces(text: string): ContractPiece[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(parsePiece);
}

function pieceText(p: ContractPiece): string {
  if (p.kind === "table") return p.rows.map((r) => r.join(" | ")).join("\n");
  if (p.kind === "list") return p.items.map((i) => `- ${i}`).join("\n");
  if (p.num === null) return p.text;
  return `${p.off ? `${OFF} ` : ""}${p.num}. ${p.text}`;
}

export function piecesToText(pieces: ContractPiece[]): string {
  return pieces
    .map(pieceText)
    .filter((t) => t.trim())
    .join("\n\n");
}

export type ContractLayout = {
  clauses: {
    on: boolean;
    /** Número da cláusula depois de fechar os buracos; null se não é numerada. */
    num: number | null;
    pieces: { on: boolean; label: string | null }[];
  }[];
  /** Número antigo -> novo, para acertar "conforme a Cláusula 8". */
  refs: Record<string, string>;
};

const CLAUSE_NUM = /^Cláusula\s+(\d+)/;

/**
 * Quem está ligado e como fica a numeração. Um item desligado leva junto o
 * que vem depois dele até o próximo item numerado (a tabela e a lista que o
 * explicam); um item de nível 1 desligado leva também os de nível 2.
 */
export function layoutContract(clauses: ContractClauseInput[]): ContractLayout {
  const refs: Record<string, string> = {};
  let contador = 0;

  const layout = clauses.map((c) => {
    const m = c.title?.match(CLAUSE_NUM);
    const on = !c.off;
    const num = on && m ? ++contador : null;
    if (num !== null && m) refs[m[1]] = String(num);

    let pulaTudo = false;
    let pulaFilho = false;
    let n2 = 0;
    let n3 = 0;

    const pieces = c.pieces.map((p) => {
      if (!on) return { on: false, label: null };
      if (p.kind !== "text" || p.num === null || num === null) {
        return { on: !(pulaTudo || pulaFilho), label: null };
      }
      const nivel = p.num.split(".").length;
      if (nivel === 2) {
        pulaFilho = false;
        pulaTudo = p.off;
        if (p.off) return { on: false, label: null };
        n2 += 1;
        n3 = 0;
        const label = `${num}.${n2}`;
        refs[p.num] = label;
        return { on: true, label };
      }
      if (pulaTudo) return { on: false, label: null };
      pulaFilho = p.off;
      if (p.off) return { on: false, label: null };
      n3 += 1;
      const label = `${num}.${n2}.${n3}`;
      refs[p.num] = label;
      return { on: true, label };
    });

    return { on, num, pieces };
  });

  return { clauses: layout, refs };
}

function remapRefs(texto: string, refs: Record<string, string>) {
  return texto.replace(
    /(Cláusulas?\s+)(\d+(?:\.\d+){0,2})/g,
    (_, antes: string, n: string) => antes + (refs[n] ?? n),
  );
}

/** O corpo como o cliente lê: sem o que está desligado e com a numeração
 *  fechada. Corpo sem nada desligado e já em ordem sai como entrou. */
export function applyToggles(body: string): string {
  const clausulas = splitClauses(body).map((c) => {
    const { title, off } = parseClauseTitle(c.title);
    return { title, off, pieces: parsePieces(c.text) };
  });
  const { clauses: layout, refs } = layoutContract(clausulas);

  return joinClauses(
    clausulas.flatMap((c, i) => {
      const l = layout[i];
      if (!l.on) return [];
      const pieces = c.pieces.flatMap((p, j) => {
        if (!l.pieces[j].on) return [];
        if (p.kind === "table") {
          return [
            { ...p, rows: p.rows.map((r) => r.map((x) => remapRefs(x, refs))) },
          ];
        }
        if (p.kind === "list") {
          return [{ ...p, items: p.items.map((x) => remapRefs(x, refs)) }];
        }
        const label = l.pieces[j].label;
        return [
          {
            ...p,
            off: false,
            num: label ?? p.num,
            text: remapRefs(p.text, refs),
          },
        ];
      });
      const title =
        c.title !== null && l.num !== null
          ? c.title.replace(CLAUSE_NUM, `Cláusula ${l.num}`)
          : c.title;
      return [{ title, text: piecesToText(pieces) }];
    }),
  );
}
