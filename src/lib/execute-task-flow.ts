export const EXECUTE_TASK_QUERY = "taskId";
export const EXECUTE_TASK_STORAGE_KEY = "honeypush-execute-task-v1";

export type ExecuteTaskPayload = {
  taskId: number;
};

export function buildExecuteTaskUrl(taskId: number) {
  return `/monitor?${EXECUTE_TASK_QUERY}=${taskId}`;
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
