import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import {
  applySessionCookie,
  createSessionForUser,
  getPasswordUserByEmail,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");

  if (!isValidEmail(email) || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  const user = await getPasswordUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

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
}
