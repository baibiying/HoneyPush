import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/queries";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/db/errors";
import { hashPassword } from "@/lib/auth/password";
import {
  applySessionCookie,
  createPasswordUser,
  createSessionForUser,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");
  const name = typeof body?.name === "string" ? body.name : null;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "请输入有效邮箱地址" }, { status: 400 });
  }

  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "密码至少需要 8 位" }, { status: 400 });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createPasswordUser({ email, passwordHash, name });
    const { sessionToken, expiresAt } = await createSessionForUser(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });

    applySessionCookie(response, sessionToken, expiresAt);
    return response;
  } catch (error) {
    console.error("[auth/register]", error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
    }
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
