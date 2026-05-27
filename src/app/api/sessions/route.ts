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
  const distractionCount = Number(body.distractionCount ?? 0);
  const outcome =
    body.outcome === "failed" ? ("failed" as const) : ("completed" as const);
  const taskId =
    typeof body.taskId === "number" && Number.isFinite(body.taskId)
      ? body.taskId
      : null;
  const durationMinutes =
    typeof body.durationMinutes === "number" && body.durationMinutes > 0
      ? Math.round(body.durationMinutes)
      : 25;
  const coinsEarned =
    outcome === "failed"
      ? 0
      : typeof body.coinsEarned === "number" && Number.isFinite(body.coinsEarned)
        ? Math.max(0, Math.round(body.coinsEarned))
        : undefined;

  const session = await createFocusSession(userId, officerId, distractionCount, {
    outcome,
    taskId,
    durationMinutes,
    coinsEarned,
  });

  const stats =
    outcome === "completed"
      ? await upsertUserStats(userId, session.coinsEarned)
      : await upsertUserStats(userId, 0);
  return NextResponse.json({ session, stats });
}
