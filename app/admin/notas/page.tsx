import { NotionHome } from "@/components/notion/NotionHome";
import { listPages } from "@/lib/notion";
import { getCurrentSession } from "@/lib/session";

export default async function NotasPage() {
  const [session, pages] = await Promise.all([getCurrentSession(), listPages()]);
  const allowed = session?.role === "admin" ? null : (session?.allowedSections ?? null);
  const live = pages.filter((p) => !p.archived_at);
  const recent = [...live].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8);
  return <NotionHome recent={recent} favorites={live.filter((p) => p.favorite)} allowedSections={allowed} />;
}
