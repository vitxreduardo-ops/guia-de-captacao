import { creatorColor, type EditorialIdea } from "@/lib/editorialMonths";

/**
 * Quem anotou a ideia: retângulo colorido com o nome. A cor é da pessoa (a
 * mesma em toda tela). No portal, as ideias do próprio cliente dizem "Você".
 */
export function CreatorTag({
  idea,
  viewerIsClient = false,
}: {
  idea: Pick<EditorialIdea, "created_by_name" | "created_by_role">;
  viewerIsClient?: boolean;
}) {
  // Ideia antiga, de antes de guardarmos o autor: foi anotada pela equipe.
  const name = idea.created_by_name ?? "Equipe Tatú";
  const label =
    viewerIsClient && idea.created_by_role === "client" ? "Você" : name;
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 align-middle text-[11px] font-medium leading-none text-white"
      style={{ backgroundColor: creatorColor(name) }}
    >
      {label}
    </span>
  );
}
