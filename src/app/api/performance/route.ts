import { requireUser } from "@/lib/auth/session";
import { getAllFocusSessions, getTasks, getUserStats } from "@/lib/db/queries";
import { buildTaskPerformanceReport } from "@/lib/task-performance";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const [tasks, sessions, stats] = await Promise.all([
    getTasks(userId),
    getAllFocusSessions(userId),
    getUserStats(userId),
  ]);

  const report = buildTaskPerformanceReport(
    tasks,
    sessions,
    stats?.totalCoins ?? 0
  );

  return NextResponse.json(report);
}
