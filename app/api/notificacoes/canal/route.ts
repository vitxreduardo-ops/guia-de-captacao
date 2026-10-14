import { NextResponse } from "next/server";
import { notificationChannel } from "@/lib/notifications";
import { getCurrentSession } from "@/lib/session";

/** Dados para o app do Mac abrir a conexão em tempo real. A chave é a pública (anon). */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "config" }, { status: 503 });

  return NextResponse.json({
    socket: `${url.replace(/^http/, "ws")}/realtime/v1/websocket`,
    anonKey,
    channel: notificationChannel(session.userId),
  });
}
