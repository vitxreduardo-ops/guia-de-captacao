import { NextResponse, type NextRequest } from "next/server";
import { fetchLinkMeta } from "@/lib/linkMeta";
import { getCurrentSession } from "@/lib/session";

/** Título, descrição, capa e endereço de embed de um link colado no Notion. */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role === "client") {
    return NextResponse.json({ error: "Sem acesso" }, { status: 401 });
  }
  if (
    session.role !== "admin" &&
    session.allowedSections !== null &&
    !session.allowedSections.includes("notas")
  ) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  const { url } = (await request.json().catch(() => ({}))) as { url?: unknown };
  const meta = typeof url === "string" ? await fetchLinkMeta(url) : null;
  if (!meta) return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  return NextResponse.json(meta);
}
