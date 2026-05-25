import { request } from "@/lib/api/request";
import { STATS_CHANGED_EVENT, emitClientEvent } from "@/lib/client-events";

export async function recordTaskExecutionFailure(params: {
  taskId: number;
  officerId: string;
  distractionCount?: number;
  durationMinutes?: number;
}) {
  const res = await request("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      officerId: params.officerId,
      distractionCount: params.distractionCount ?? 0,
      taskId: params.taskId,
      outcome: "failed",
      durationMinutes: params.durationMinutes ?? 25,
    }),
  });

  if (res.ok) {
    emitClientEvent(STATS_CHANGED_EVENT);
  }

  return res.ok;
}

export async function recordTaskExecutionSuccess(params: {
  taskId?: number;
  officerId: string;
  distractionCount?: number;
  durationMinutes?: number;
}) {
  const res = await request("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      officerId: params.officerId,
      distractionCount: params.distractionCount ?? 0,
      taskId: params.taskId,
      outcome: "completed",
      durationMinutes: params.durationMinutes ?? 25,
    }),
  });

  if (res.ok) {
    emitClientEvent(STATS_CHANGED_EVENT);
  }

  return res.ok;
}
