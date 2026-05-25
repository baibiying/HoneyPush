import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, destroySession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  await destroySession(req);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
