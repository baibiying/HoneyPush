import { request } from "@/lib/api/request";
import { STATS_CHANGED_EVENT, emitClientEvent } from "@/lib/client-events";

export type TaskExecutionRecordPayload = {
  session?: {
    coinsEarned?: number;
    distractionCount?: number;
    durationMinutes?: number;
    outcome?: string;
  };
  stats?: {
    totalCoins?: number;
    totalSessions?: number;
  };
};

export type TaskExecutionRecordResult = {
  ok: boolean;
  data?: TaskExecutionRecordPayload;
};

async function postTaskExecution(body: Record<string, unknown>): Promise<TaskExecutionRecordResult> {
  const res = await request("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false };
  }

  try {
    const data = (await res.json()) as TaskExecutionRecordPayload;
    emitClientEvent(STATS_CHANGED_EVENT);
    return { ok: true, data };
  } catch {
    emitClientEvent(STATS_CHANGED_EVENT);
    return { ok: true };
  }
}

export async function recordTaskExecutionFailure(params: {
  taskId: number;
  officerId: string;
  distractionCount?: number;
  durationMinutes?: number;
}): Promise<TaskExecutionRecordResult> {
  return postTaskExecution({
    officerId: params.officerId,
    distractionCount: params.distractionCount ?? 0,
    taskId: params.taskId,
    outcome: "failed",
    durationMinutes: params.durationMinutes ?? 25,
    coinsEarned: 0,
  });
}

export async function recordTaskExecutionSuccess(params: {
  taskId?: number;
  officerId: string;
  distractionCount?: number;
  durationMinutes?: number;
  coinsEarned: number;
}): Promise<TaskExecutionRecordResult> {
  return postTaskExecution({
    officerId: params.officerId,
    distractionCount: params.distractionCount ?? 0,
    taskId: params.taskId,
    outcome: "completed",
    durationMinutes: params.durationMinutes ?? 25,
    coinsEarned: Math.max(0, Math.round(params.coinsEarned)),
  });
}
