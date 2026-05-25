import { requireAuth } from "@/lib/auth";
import { getTasks, createTask } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const result = requireAuth(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const items = await getTasks(userId);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const result = requireAuth(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const body = await req.json();
  if (!body.text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const task = await createTask(userId, body.text, body.category ?? "import-urgent", body.durationMinutes ?? 25);
  return NextResponse.json(task);
}
