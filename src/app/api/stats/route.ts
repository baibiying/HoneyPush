import { requireUser } from "@/lib/auth/session";
import { getUserStats, upsertUserStats } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const stats = await getUserStats(userId);
  return NextResponse.json(
    stats ?? { totalCoins: 0, consecutiveDays: 0, totalSessions: 0, unlockedBadges: [] }
  );
}

export async function POST(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const body = await req.json();
  const deltaCoins = body.deltaCoins ?? 15;

  const updated = await upsertUserStats(userId, deltaCoins);
  return NextResponse.json(updated);
}
