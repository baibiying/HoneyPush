import { requireUser } from "@/lib/auth/session";
import { createFocusSession, getFocusSessions, upsertUserStats } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const sessions = await getFocusSessions(userId, 30);
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const body = await req.json();
  const officerId = body.officerId ?? "yuri";
  const distractionCount = body.distractionCount ?? 0;

  const session = await createFocusSession(userId, officerId, distractionCount);
  const stats = await upsertUserStats(userId, session.coinsEarned);
  return NextResponse.json({ session, stats });
}
