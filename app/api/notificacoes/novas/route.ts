import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** O app do Mac pergunta a cada poucos segundos o que chegou depois de `since`. */
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });

  const since = new URL(request.url).searchParams.get("since");
  if (!since || Number.isNaN(Date.parse(since)))
    return NextResponse.json({ error: "since" }, { status: 400 });

  const { data, error } = await getSupabaseServerClient()
    .from("notifications")
    .select("id, title, body, link, created_at")
    .eq("user_id", session.userId)
    .is("read_at", null)
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) return NextResponse.json({ error: "servidor" }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}
