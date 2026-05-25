import { requireUser } from "@/lib/auth/session";
import { getTasks, createTask } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

const VALID_CATEGORIES = new Set([
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
]);

function parseDeadline(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export async function GET(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const items = await getTasks(userId);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const result = await requireUser(req);
  if (!result.ok) return result.response;
  const { id: userId } = result.user;

  const body = await req.json();
  if (!body.text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const deadline = parseDeadline(body.deadline);
  if (deadline === undefined) {
    return NextResponse.json({ error: "deadline is invalid" }, { status: 400 });
  }
  if (!deadline) {
    return NextResponse.json({ error: "deadline is required" }, { status: 400 });
  }

  const category = typeof body.category === "string" ? body.category : "";
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const task = await createTask(
    userId,
    body.text,
    category,
    body.durationMinutes ?? 25,
    deadline
  );
  return NextResponse.json(task);
}
