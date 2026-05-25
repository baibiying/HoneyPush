import { requireAuth } from "@/lib/auth";
import { updateTask, deleteTask } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const result = requireAuth(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const updated = await updateTask(id, userId, body);
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const result = requireAuth(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const ok = await deleteTask(id, userId);
  return NextResponse.json({ ok });
}
