import { and, eq, lt } from "drizzle-orm";
import { db } from "../client";
import { authSessions, users } from "../schema";

export async function createAuthSession(
  userId: string,
  sessionTokenHash: string,
  expiresAt: Date
) {
  const rows = await db
    .insert(authSessions)
    .values({ userId, sessionTokenHash, expiresAt })
    .returning();

  return rows[0];
}

export async function getAuthSessionWithUser(sessionTokenHash: string) {
  const rows = await db
    .select({
      session: authSessions,
      user: users,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(eq(authSessions.sessionTokenHash, sessionTokenHash))
    .limit(1);

  return rows[0] ?? null;
}

export async function deleteAuthSession(sessionTokenHash: string) {
  const rows = await db
    .delete(authSessions)
    .where(eq(authSessions.sessionTokenHash, sessionTokenHash))
    .returning({ id: authSessions.id });

  return rows.length > 0;
}

export async function deleteExpiredAuthSessions(now: Date = new Date()) {
  await db.delete(authSessions).where(lt(authSessions.expiresAt, now));
}

export async function deleteUserAuthSession(userId: string, sessionTokenHash: string) {
  const rows = await db
    .delete(authSessions)
    .where(
      and(
        eq(authSessions.userId, userId),
        eq(authSessions.sessionTokenHash, sessionTokenHash)
      )
    )
    .returning({ id: authSessions.id });

  return rows.length > 0;
}
