import { creatorColor, type EditorialIdea } from "@/lib/editorialMonths";

/**
 * Quem anotou a ideia: retângulo colorido com o nome. A cor é da pessoa (a
 * mesma em toda tela). No portal, as ideias do próprio cliente dizem "Você".
 */
export function CreatorTag({
  idea,
  viewerId = null,
}: {
  idea: Pick<EditorialIdea, "created_by" | "created_by_name" | "created_by_role">;
  /** Quem está olhando: as ideias dele aparecem como "Você". */
  viewerId?: string | null;
}) {
  // Ideia antiga, de antes de guardarmos o autor: foi anotada pela equipe.
  const name = idea.created_by_name ?? "Equipe Tatú";
  const label = viewerId && idea.created_by === viewerId ? "Você" : name;
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 align-middle text-[11px] font-medium leading-none text-white"
      style={{ backgroundColor: creatorColor(name) }}
    >
      {label}
    </span>
  );
}
