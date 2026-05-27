import { expandScheduledTaskToFocusSegments } from "@/lib/ai/schedule-times";
import type { FocusSession } from "@/lib/db/schema/focus-sessions";
import type { Task } from "@/lib/db/schema/focus-sessions";

/** 段结束后仍允许计入「本段内执行」的宽限（毫秒） */
const SEGMENT_END_GRACE_MS = 60 * 1000;
/** 允许略早于排期开始计入的重叠宽限（毫秒） */
const SEGMENT_START_EARLY_MS = 2 * 60 * 1000;

export type TaskPerformanceFailureReason = "supervision_failed" | "missed_schedule";

export type TaskPerformanceItem = {
  taskId: number;
  taskText: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  at: string;
  reason?: TaskPerformanceFailureReason;
  coinsEarned?: number;
  distractionCount?: number;
};

export type TaskPerformanceReport = {
  totalCoins: number;
  successCount: number;
  failureCount: number;
  successes: TaskPerformanceItem[];
  failures: TaskPerformanceItem[];
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toExpandableTask(task: Task) {
  return {
    id: task.id,
    text: task.text,
    durationMinutes: task.durationMinutes,
    scheduledStartAt: toIso(task.scheduledStartAt),
    scheduledEndAt: toIso(task.scheduledEndAt),
    scheduledFocusSegments: task.scheduledFocusSegments,
  };
}

export function sessionOverlapsFocusSegment(
  session: Pick<FocusSession, "taskId" | "completedAt">,
  segment: { startAt: string; endAt: string }
): boolean {
  if (session.taskId == null) return false;
  const t = session.completedAt.getTime();
  const start = new Date(segment.startAt).getTime();
  const end = new Date(segment.endAt).getTime();
  if (Number.isNaN(t) || Number.isNaN(start) || Number.isNaN(end)) return false;
  return t >= start - SEGMENT_START_EARLY_MS && t <= end + SEGMENT_END_GRACE_MS;
}

function hasSessionInSegment(
  sessions: FocusSession[],
  segment: { startAt: string; endAt: string }
) {
  return sessions.some((session) => sessionOverlapsFocusSegment(session, segment));
}

function isSegmentMissed(
  segment: { startAt: string; endAt: string },
  sessions: FocusSession[],
  now: Date
) {
  const endMs = new Date(segment.endAt).getTime();
  if (Number.isNaN(endMs) || now.getTime() < endMs) return false;
  return !hasSessionInSegment(sessions, segment);
}

function latestSession(
  sessions: FocusSession[],
  outcome: FocusSession["outcome"]
) {
  return [...sessions]
    .filter((session) => session.outcome === outcome)
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
}

function buildItemFromTask(
  task: Task,
  at: Date | string,
  extra?: Partial<TaskPerformanceItem>
): TaskPerformanceItem {
  return {
    taskId: task.id,
    taskText: task.text,
    scheduledStartAt: toIso(task.scheduledStartAt),
    scheduledEndAt: toIso(task.scheduledEndAt),
    at: toIso(at) ?? new Date().toISOString(),
    ...extra,
  };
}

/**
 * 根据任务排期与专注场次记录汇总用户表现。
 * 未在排期时段内执行（含未登录、关页、未响应到点）视为 missed_schedule 失败。
 */
export function buildTaskPerformanceReport(
  tasks: Task[],
  sessions: FocusSession[],
  totalCoins: number,
  now = new Date()
): TaskPerformanceReport {
  const sessionsByTaskId = new Map<number, FocusSession[]>();
  for (const session of sessions) {
    if (session.taskId == null) continue;
    const list = sessionsByTaskId.get(session.taskId) ?? [];
    list.push(session);
    sessionsByTaskId.set(session.taskId, list);
  }

  const successes: TaskPerformanceItem[] = [];
  const failures: TaskPerformanceItem[] = [];
  const seenSuccess = new Set<number>();
  const seenFailure = new Set<number>();

  for (const task of tasks) {
    const taskSessions = sessionsByTaskId.get(task.id) ?? [];
    const completed = latestSession(taskSessions, "completed");

    if (completed) {
      if (!seenSuccess.has(task.id)) {
        seenSuccess.add(task.id);
        successes.push(
          buildItemFromTask(task, completed.completedAt, {
            coinsEarned: completed.coinsEarned,
            distractionCount: completed.distractionCount,
          })
        );
      }
      continue;
    }

    const failed = latestSession(taskSessions, "failed");
    if (failed) {
      if (!seenFailure.has(task.id)) {
        seenFailure.add(task.id);
        failures.push(
          buildItemFromTask(task, failed.completedAt, {
            reason: "supervision_failed",
            distractionCount: failed.distractionCount,
            coinsEarned: failed.coinsEarned,
          })
        );
      }
      continue;
    }

    const expandable = toExpandableTask(task);
    const segments = expandScheduledTaskToFocusSegments(expandable);
    if (segments.length === 0) continue;

    const missedSegment = segments.find((segment) =>
      isSegmentMissed(segment, taskSessions, now)
    );
    if (!missedSegment) continue;

    if (!seenFailure.has(task.id)) {
      seenFailure.add(task.id);
      failures.push(
        buildItemFromTask(task, missedSegment.startAt, {
          reason: "missed_schedule",
        })
      );
    }
  }

  successes.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  failures.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    totalCoins,
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  };
}

export function getTaskPerformanceFailureLabel(reason: TaskPerformanceFailureReason) {
  if (reason === "missed_schedule") {
    return "未到点执行（未登录或离开页面）";
  }
  return "监督执行失败";
}
