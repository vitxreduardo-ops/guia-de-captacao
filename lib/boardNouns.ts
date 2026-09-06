import type { BacklogBoardKind } from "@/lib/backlogTypes";

/**
 * O kanban serve dois quadros, e cada um chama a coisa que carrega pelo nome
 * que a equipe usa: no Instagram é material, no de cliente é entrega. O
 * componente é o mesmo; o vocabulário não pode ser.
 */
export interface BoardNouns {
  /** "Novo material" / "Nova entrega" — placeholder e rótulo do botão. */
  novo: string;
  /** Estado vazio da coluna. */
  nenhum: string;
  /**
   * Frase de contagem do aviso de exclusão da coluna. É uma função porque o
   * português concorda em gênero e número: "1 entrega será excluída" e
   * "3 materiais serão excluídos" não saem de um mesmo molde com substituição.
   */
  contagemExcluida: (total: number) => string;
  /** Nome do campo de data, que no quadro de entregas define a competência. */
  data: string;
}

export const BOARD_NOUNS: Record<BacklogBoardKind, BoardNouns> = {
  instagram: {
    novo: "Novo material",
    nenhum: "Nenhum material",
    contagemExcluida: (total) =>
      total === 1 ? "1 material será excluído" : `${total} materiais serão excluídos`,
    data: "Data de post",
  },
  entregas: {
    novo: "Nova entrega",
    nenhum: "Nenhuma entrega",
    contagemExcluida: (total) =>
      total === 1 ? "1 entrega será excluída" : `${total} entregas serão excluídas`,
    data: "Data da entrega",
  },
};
