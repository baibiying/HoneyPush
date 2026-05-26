import { enterSupervisionTakeover } from "@/lib/supervision-takeover";

export const EXECUTE_TASK_STORAGE_KEY = "honeypush-execute-task-v1";

export type ExecuteTaskPayload = {
  taskId: number;
};

/** 到点/自动执行：全屏叠层监督，不改变当前路由 */
export function beginAutoTaskSupervision(taskId: number) {
  stashExecuteTask(taskId);
  enterSupervisionTakeover(taskId);
}

export function stashExecuteTask(taskId: number) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    EXECUTE_TASK_STORAGE_KEY,
    JSON.stringify({ taskId } satisfies ExecuteTaskPayload)
  );
}

export function readStashedExecuteTaskId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(EXECUTE_TASK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExecuteTaskPayload;
    const id = Number(parsed?.taskId);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function clearStashedExecuteTask() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(EXECUTE_TASK_STORAGE_KEY);
}
