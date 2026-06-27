import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/db/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[auth/me]", error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(databaseUnavailableResponse(), { status: 503 });
    }
    return NextResponse.json({ error: "无法读取登录状态" }, { status: 500 });
  }
}
