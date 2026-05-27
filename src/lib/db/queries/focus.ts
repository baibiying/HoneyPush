import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { focusSessions, tasks, userStats } from "../schema";
import type { Task } from "../schema/focus-sessions";

// ─── Focus Sessions ──────────────────────────────────────────────────────────

export type FocusSessionOutcome = "completed" | "failed";

export async function createFocusSession(
  userId: string,
  officerId: string,
  distractionCount: number = 0,
  options?: {
    outcome?: FocusSessionOutcome;
    taskId?: number | null;
    coinsEarned?: number;
    durationMinutes?: number;
  }
) {
  const outcome = options?.outcome ?? "completed";
  const coinsEarned = options?.coinsEarned ?? (outcome === "completed" ? 15 : 0);

  const rows = await db
    .insert(focusSessions)
    .values({
      userId,
      officerId,
      taskId: options?.taskId ?? null,
      outcome,
      distractionCount,
      coinsEarned,
      durationMinutes: options?.durationMinutes ?? 25,
    })
    .returning();
  return rows[0];
}

export async function getFocusSessions(userId: string, limit = 30) {
  return db
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.userId, userId))
    .orderBy(desc(focusSessions.completedAt))
    .limit(limit);
}

export async function getAllFocusSessions(userId: string) {
  return db
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.userId, userId))
    .orderBy(desc(focusSessions.completedAt));
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasks(userId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));
}

export async function createTask(
  userId: string,
  text: string,
  category: string = "import-urgent",
  durationMinutes: number = 25,
  deadline?: Date | null
) {
  const rows = await db
    .insert(tasks)
    .values({ userId, text, category, durationMinutes, deadline: deadline ?? null })
    .returning();
  return rows[0];
}

export async function updateTask(
  id: number,
  userId: string,
  data: Partial<
    Pick<
      Task,
      | "text"
      | "checked"
      | "category"
      | "durationMinutes"
      | "deadline"
      | "scheduledStartAt"
      | "scheduledEndAt"
      | "scheduledFocusSegments"
    >
  >
) {
  const rows = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  return rows[0];
}

export async function deleteTask(id: number, userId: string) {
  const rows = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  return rows.length > 0;
}

// ─── User Stats ───────────────────────────────────────────────────────────────

export async function getUserStats(userId: string) {
  const rows = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));
  return rows[0] ?? null;
}

export async function upsertUserStats(userId: string, deltaCoins: number = 0) {
  const existing = await getUserStats(userId);
  const now = new Date();

  if (!existing) {
    const rows = await db
      .insert(userStats)
      .values({
        userId,
        totalCoins: deltaCoins,
        consecutiveDays: 1,
        totalSessions: 1,
        lastSessionDate: now,
        unlockedBadges: ["exam_badge"],
      })
      .returning();
    return rows[0];
  }

  // Calculate consecutive days
  const lastDate = existing.lastSessionDate;
  let newConsecutive = existing.consecutiveDays;
  if (lastDate) {
    const dayDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff === 1) newConsecutive += 1;
    else if (dayDiff > 1) newConsecutive = 1;
  }

  const rows = await db
    .update(userStats)
    .set({
      totalCoins: existing.totalCoins + deltaCoins,
      consecutiveDays: newConsecutive,
      totalSessions: existing.totalSessions + 1,
      lastSessionDate: now,
      updatedAt: now,
    })
    .where(eq(userStats.userId, userId))
    .returning();
  return rows[0];
}
