import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createAuthSession,
  deleteAuthSession,
  getAuthSessionWithUser,
  getUserByEmail,
} from "@/lib/db/queries";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const SESSION_COOKIE_NAME = "honeypush_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type UserRecord = typeof users.$inferSelect;

function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string) {
  return password.trim().length >= 8;
}

export function generateUserId() {
  return `usr_${randomUUID()}`;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildSessionCookieValue() {
  return randomBytes(32).toString("hex");
}

function getSessionExpiresAt() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function getPasswordUserByEmail(email: string) {
  const user = await getUserByEmail(normalizeEmail(email));
  return user?.authProvider === "password" ? user : null;
}

export async function createPasswordUser(input: {
  email: string;
  passwordHash: string;
  name?: string | null;
}) {
  const rows = await db
    .insert(users)
    .values({
      id: generateUserId(),
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
      authProvider: "password",
      emailVerifiedAt: new Date(),
      name: input.name?.trim() || null,
      avatarUrl: null,
    })
    .returning();

  return rows[0];
}

export async function createSessionForUser(userId: string) {
  const sessionToken = buildSessionCookieValue();
  const expiresAt = getSessionExpiresAt();

  await createAuthSession(userId, hashSessionToken(sessionToken), expiresAt);
  return { sessionToken, expiresAt };
}

export function applySessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt: Date
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function destroySession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteAuthSession(hashSessionToken(token));
  }
}

export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  const record = await getAuthSessionWithUser(hashSessionToken(sessionToken));
  if (!record) return null;

  if (record.session.expiresAt.getTime() <= Date.now()) {
    await deleteAuthSession(record.session.sessionTokenHash);
    return null;
  }

  return toAuthUser(record.user);
}

export async function requireUser(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    user,
  };
}
