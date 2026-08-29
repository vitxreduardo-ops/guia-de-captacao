import { arrayMove } from "@dnd-kit/sortable";
import type { Layer } from "@/lib/lettering";

export type EditorState = {
  layers: Layer[];
  selectedId: string | null;
};

/**
 * Ações do editor.
 *
 * `coalesce` junta passos contínuos num só: arrastar uma camada emite dezenas
 * de ações por segundo, e desfazer tem que voltar o arrasto inteiro, não um
 * pixel. Enquanto a chave se repete, o histórico substitui o topo em vez de
 * empilhar; `encerrarGesto` corta a chave e o próximo passo vira um novo.
 */
export type Action =
  | { type: "adicionar"; layer: Layer }
  | { type: "selecionar"; id: string | null }
  | { type: "alterar"; id: string; patch: Partial<Layer>; coalesce?: string }
  | { type: "remover"; id: string }
  | { type: "duplicar"; id: string; novoId: string; desloca: number }
  | { type: "reordenar"; de: number; para: number }
  | { type: "trocarTudo"; state: EditorState };

export function reduce(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "adicionar":
      return {
        layers: [...state.layers, action.layer],
        // Camada nova já entra escolhida: é o que a pessoa vai querer editar.
        selectedId: action.layer.id,
      };

    case "selecionar":
      // Escolher o que já estava escolhido não é mudança. Devolver um estado
      // novo aqui fazia a tela inteira reconciliar e o rascunho ser regravado
      // a cada toque no palco.
      if (state.selectedId === action.id) return state;
      return { ...state, selectedId: action.id };

    case "alterar":
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, ...action.patch } : l,
        ),
      };

    case "duplicar": {
      const original = state.layers.find((l) => l.id === action.id);
      if (!original) return state;
      // A cópia nasce um pouco ao lado: exatamente em cima da original ela
      // pareceria que nada aconteceu.
      const copia: Layer = {
        ...original,
        id: action.novoId,
        x: original.x + action.desloca,
        y: original.y + action.desloca,
      };
      const i = state.layers.indexOf(original);
      const layers = [...state.layers];
      layers.splice(i + 1, 0, copia);
      return { layers, selectedId: copia.id };
    }

    case "remover": {
      const layers = state.layers.filter((l) => l.id !== action.id);
      return {
        layers,
        selectedId:
          state.selectedId === action.id
            ? (layers[layers.length - 1]?.id ?? null)
            : state.selectedId,
      };
    }

    case "reordenar":
      // Soltar a camada no mesmo lugar não é uma mudança — devolver um array
      // novo aqui gastaria um passo do histórico à toa.
      if (action.de === action.para) return state;
      return {
        ...state,
        layers: arrayMove(state.layers, action.de, action.para),
      };

    case "trocarTudo":
      return action.state;
  }
}

export type History = {
  passado: EditorState[];
  presente: EditorState;
  futuro: EditorState[];
  /** Chave do passo no topo, pra saber o que ainda pode ser agrupado. */
  chave: string | null;
};

/** Passos guardados. O suficiente pra desfazer uma sessão inteira de trabalho. */
const LIMITE = 100;

export function historyOf(presente: EditorState): History {
  return { passado: [], presente, futuro: [], chave: null };
}

export function despachar(history: History, action: Action): History {
  const presente = reduce(history.presente, action);
  if (presente === history.presente) return history;

  // Selecionar não é um passo: desfazer depois de mover tem que voltar o
  // movimento, não a escolha da camada que veio junto com ele.
  if (action.type === "selecionar") {
    return { ...history, presente };
  }

  const chave = action.type === "alterar" ? (action.coalesce ?? null) : null;

  if (chave !== null && chave === history.chave) {
    return { ...history, presente, futuro: [] };
  }

  return {
    passado: [...history.passado, history.presente].slice(-LIMITE),
    presente,
    futuro: [],
    chave,
  };
}

/** Fim do gesto: o próximo passo começa do zero em vez de grudar neste. */
export function encerrarGesto(history: History): History {
  return history.chave === null ? history : { ...history, chave: null };
}

export function desfazer(history: History): History {
  const anterior = history.passado[history.passado.length - 1];
  if (!anterior) return history;
  return {
    passado: history.passado.slice(0, -1),
    presente: anterior,
    futuro: [history.presente, ...history.futuro],
    chave: null,
  };
}

export function refazer(history: History): History {
  const proximo = history.futuro[0];
  if (!proximo) return history;
  return {
    passado: [...history.passado, history.presente],
    presente: proximo,
    futuro: history.futuro.slice(1),
    chave: null,
  };
}

export const podeDesfazer = (h: History) => h.passado.length > 0;
export const podeRefazer = (h: History) => h.futuro.length > 0;
