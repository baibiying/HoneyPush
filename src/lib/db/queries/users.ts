import { eq } from "drizzle-orm";
import { db } from "../client";
import { users, type User } from "../schema/users";

export async function getUserById(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0];
}

export async function upsertUser(data: {
  id: string;
  email?: string | null;
  passwordHash?: string | null;
  authProvider?: string | null;
  emailVerifiedAt?: Date | null;
  name?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  const rows = await db
    .insert(users)
    .values({
      ...data,
      authProvider: data.authProvider ?? "eazo",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: data.email ?? null,
        passwordHash: data.passwordHash ?? null,
        authProvider: data.authProvider ?? "eazo",
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        name: data.name ?? null,
        avatarUrl: data.avatarUrl ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

export async function updateUser(
  id: string,
  data: { name?: string | null; avatarUrl?: string | null }
): Promise<User | undefined> {
  if (Object.keys(data).length === 0) return getUserById(id);

  const rows = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return rows[0];
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  return rows.length > 0;
}
