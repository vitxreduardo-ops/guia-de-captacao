import { NotasShell } from "@/components/notion/NotasShell";
import { listPages } from "@/lib/notion";
import { requireTeam } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NotasLayout({ children }: LayoutProps<"/admin/notas">) {
  const session = await requireTeam("notas");
  const pages = await listPages();
  const allowed = session.role === "admin" ? null : session.allowedSections;
  return (
    <NotasShell pages={pages} allowedSections={allowed}>
      {children}
    </NotasShell>
  );
}
