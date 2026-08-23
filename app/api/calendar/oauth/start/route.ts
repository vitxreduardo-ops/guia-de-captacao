import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { buildCalendarAuthUrl } from "@/lib/userCalendars";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");

  return NextResponse.redirect(buildCalendarAuthUrl());
}
