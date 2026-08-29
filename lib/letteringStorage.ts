import type { Layer } from "@/lib/lettering";
import type { EditorState } from "@/lib/letteringState";

const CHAVE = "lettering:rascunho";

/**
 * Versão do formato. Se o formato da camada mudar, este número muda junto e o
 * rascunho antigo é descartado em vez de voltar quebrado na tela.
 */
const VERSAO = 1;

type Guardado = {
  versao: number;
  layers: Layer[];
  selectedId: string | null;
};

/**
 * O que é seguro guardar do estado. A fonte do cliente não cabe aqui: ela vive
 * como arquivo na memória do navegador e some ao fechar a aba — o que volta é
 * só o nome da família, e o desenho cai na fonte de reserva até ela ser
 * carregada de novo.
 */
export function paraGuardar(state: EditorState): Guardado {
  return {
    versao: VERSAO,
    layers: state.layers,
    selectedId: state.selectedId,
  };
}

export function serializar(state: EditorState): string {
  return JSON.stringify(paraGuardar(state));
}

export function desserializar(texto: string | null): EditorState | null {
  if (!texto) return null;
  try {
    return validar(JSON.parse(texto));
  } catch {
    return null;
  }
}

/**
 * Valida um layout já em forma de objeto — é assim que ele chega da
 * biblioteca, onde o banco guarda JSON e não texto.
 */
export function validar(entrada: unknown): EditorState | null {
  try {
    const dado = entrada as Partial<Guardado>;
    if (dado.versao !== VERSAO) return null;
    if (!Array.isArray(dado.layers) || dado.layers.length === 0) return null;

    // Sem camada válida não há rascunho: melhor abrir vazio do que abrir num
    // estado que o desenho não consegue interpretar.
    const layers = dado.layers.filter(
      (l): l is Layer =>
        !!l && typeof l.id === "string" && typeof l.text === "string",
    );
    if (layers.length === 0) return null;

    const selectedId =
      typeof dado.selectedId === "string" &&
      layers.some((l) => l.id === dado.selectedId)
        ? dado.selectedId
        : (layers[layers.length - 1]?.id ?? null);

    return { layers, selectedId };
  } catch {
    return null;
  }
}

/**
 * Guardar e ler podem falhar por conta do navegador — aba anônima, cota cheia,
 * site sem permissão de armazenamento. Nada disso pode derrubar o editor: sem
 * rascunho a ferramenta continua funcionando, só não lembra.
 */
export function guardarRascunho(state: EditorState) {
  try {
    window.localStorage.setItem(CHAVE, serializar(state));
  } catch {
    // sem espaço ou sem permissão: seguir sem lembrar
  }
}

export function lerRascunho(): EditorState | null {
  try {
    return desserializar(window.localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function limparRascunho() {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}

/**
 * Prefixo das fontes que vieram de arquivo. Só elas podem sumir entre uma
 * sessão e outra — as do sistema e a de emoji estão sempre lá.
 */
const PREFIXO_DE_ARQUIVO = '"lettering-';

/** As fontes de arquivo que o rascunho pede e o navegador não tem mais. */
export function fontesFaltando(layers: Layer[], disponiveis: string[]): string[] {
  const usadas = new Set(layers.map((l) => l.family));
  return [...usadas].filter(
    (f) => f.startsWith(PREFIXO_DE_ARQUIVO) && !disponiveis.includes(f),
  );
}
