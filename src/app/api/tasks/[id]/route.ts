import { requireUser } from "@/lib/auth/session";
import { updateTask, deleteTask } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

function parseOptionalTimestamp(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const payload: {
    text?: string;
    checked?: boolean;
    category?: string;
    durationMinutes?: number;
    deadline?: Date | null;
    scheduledStartAt?: Date | null;
    scheduledEndAt?: Date | null;
    scheduledFocusSegments?: Array<{ startAt: string; endAt: string }> | null;
  } = {};

  if (typeof body.text === "string") {
    const text = body.text.trim();
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
    payload.text = text;
  }
  if (typeof body.checked === "boolean") payload.checked = body.checked;
  if (typeof body.category === "string") payload.category = body.category;
  if (typeof body.durationMinutes === "number") {
    payload.durationMinutes = Math.min(180, Math.max(15, Math.round(body.durationMinutes)));
  }

  const deadline = parseOptionalTimestamp(body.deadline);
  if (deadline === undefined && body.deadline !== undefined) {
    return NextResponse.json({ error: "deadline is invalid" }, { status: 400 });
  }
  if (deadline !== undefined) payload.deadline = deadline;

  const scheduledStartAt = parseOptionalTimestamp(body.scheduledStartAt);
  if (scheduledStartAt === undefined && body.scheduledStartAt !== undefined) {
    return NextResponse.json({ error: "scheduledStartAt is invalid" }, { status: 400 });
  }
  if (scheduledStartAt !== undefined) payload.scheduledStartAt = scheduledStartAt;

  const scheduledEndAt = parseOptionalTimestamp(body.scheduledEndAt);
  if (scheduledEndAt === undefined && body.scheduledEndAt !== undefined) {
    return NextResponse.json({ error: "scheduledEndAt is invalid" }, { status: 400 });
  }
  if (scheduledEndAt !== undefined) payload.scheduledEndAt = scheduledEndAt;

  if (body.scheduledFocusSegments !== undefined) {
    if (body.scheduledFocusSegments === null) {
      payload.scheduledFocusSegments = null;
    } else if (Array.isArray(body.scheduledFocusSegments)) {
      const segments: Array<{ startAt: string; endAt: string }> = [];
      for (const item of body.scheduledFocusSegments) {
        if (!item || typeof item !== "object") continue;
        const row = item as { startAt?: unknown; endAt?: unknown };
        const startAt = String(row.startAt ?? "");
        const endAt = String(row.endAt ?? "");
        if (!startAt || !endAt) continue;
        if (Number.isNaN(new Date(startAt).getTime())) continue;
        if (Number.isNaN(new Date(endAt).getTime())) continue;
        segments.push({ startAt, endAt });
      }
      payload.scheduledFocusSegments = segments.length > 0 ? segments : null;
    } else {
      return NextResponse.json(
        { error: "scheduledFocusSegments must be an array or null" },
        { status: 400 }
      );
    }
  }

  const updated = await updateTask(id, userId, payload);
  if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const ok = await deleteTask(id, userId);
  return NextResponse.json({ ok });
}
