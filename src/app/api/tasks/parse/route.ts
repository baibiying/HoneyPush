import { NextRequest } from "next/server";
import { POST as aiParseTask } from "@/app/api/ai-parse-task/route";

/** Legacy path used by older clients; forwards to /api/ai-parse-task. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const forwarded = new NextRequest(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({
      naturalLanguage: body.naturalLanguage ?? body.text ?? "",
      timezoneOffsetMinutes: body.timezoneOffsetMinutes ?? body.tzOffset,
      referenceLocal: body.referenceLocal,
    }),
  });
  return aiParseTask(forwarded);
}
