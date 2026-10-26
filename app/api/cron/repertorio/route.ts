import { NextResponse } from "next/server";
import { coletarFontes } from "@/lib/repertorio";

/**
 * Coleta do Repertório (cron da Vercel, 06:00 de Brasília): lê o feed de
 * cada fonte ativa e grava as notícias novas. A Vercel manda
 * `Authorization: Bearer $CRON_SECRET`; sem o segredo, a rota recusa tudo.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    return NextResponse.json(await coletarFontes());
  } catch (err) {
    console.error("Falha na coleta do Repertório", err);
    return NextResponse.json({ error: "Falha na coleta" }, { status: 500 });
  }
}
