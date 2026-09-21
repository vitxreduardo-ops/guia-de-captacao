/**
 * Slug de URL a partir de um título livre.
 *
 * Existe porque contratos (0053) precisavam da mesma função que budgets,
 * guides e galleries já têm cada um na sua cópia. Copiar a quarta vez era o
 * caminho curto agora e o longo na primeira correção — este arquivo é o
 * lugar pras próximas. As três cópias antigas continuam lá; trocá-las é
 * mudança de comportamento em telas que não estão em jogo.
 */
export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
