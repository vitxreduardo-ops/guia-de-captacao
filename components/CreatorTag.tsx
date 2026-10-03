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
  if (!idea.created_by_name) return null;
  const label =
    viewerIsClient && idea.created_by_role === "client" ? "Você" : idea.created_by_name;
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 align-middle text-[11px] font-medium leading-none text-white"
      style={{ backgroundColor: creatorColor(idea.created_by_name) }}
    >
      {label}
    </span>
  );
}
