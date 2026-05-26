import { emitClientEvent } from "@/lib/client-events";

export const SUPERVISION_TAKEOVER_STORAGE_KEY = "honeypush-supervision-takeover-v1";
export const SUPERVISION_TAKEOVER_EVENT = "honeypush:supervision-takeover";

export type SupervisionTakeoverState = {
  taskId: number;
};

export function enterSupervisionTakeover(taskId: number) {
  if (typeof window === "undefined") return;
  const state: SupervisionTakeoverState = { taskId };
  sessionStorage.setItem(SUPERVISION_TAKEOVER_STORAGE_KEY, JSON.stringify(state));
  document.documentElement.classList.add("supervision-takeover");
  emitClientEvent(SUPERVISION_TAKEOVER_EVENT);
}

export function readSupervisionTakeover(): SupervisionTakeoverState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SUPERVISION_TAKEOVER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupervisionTakeoverState;
    const taskId = Number(parsed?.taskId);
    if (!Number.isFinite(taskId)) return null;
    return { taskId };
  } catch {
    return null;
  }
}

export function isSupervisionTakeoverActive() {
  return readSupervisionTakeover() !== null;
}

export function exitSupervisionTakeover() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SUPERVISION_TAKEOVER_STORAGE_KEY);
  document.documentElement.classList.remove("supervision-takeover");
  emitClientEvent(SUPERVISION_TAKEOVER_EVENT);
}
