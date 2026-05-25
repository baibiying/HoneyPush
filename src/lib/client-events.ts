export const AUTH_CHANGED_EVENT = "honeypush:auth-changed";
export const TASKS_CHANGED_EVENT = "honeypush:tasks-changed";
export const STATS_CHANGED_EVENT = "honeypush:stats-changed";

export function emitClientEvent(eventName: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(eventName));
  }
}
