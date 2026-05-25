import { emitClientEvent } from "@/lib/client-events";

export const SUPERVISION_RUN_STORAGE_KEY = "honeypush-supervision-run-v1";
export const SUPERVISION_CHANGED_EVENT = "honeypush:supervision-changed";

export type SupervisionRun = {
  taskId: number;
  taskText: string;
  scheduledStartAt: string;
  officerId?: string;
  /** 已选监督官并启动计时/摄像头 */
  launched: boolean;
};

export function readSupervisionRun(): SupervisionRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SUPERVISION_RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupervisionRun;
    if (!parsed?.taskId || !parsed.taskText) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSupervisionRun(run: SupervisionRun | null) {
  if (typeof window === "undefined") return;
  if (!run) {
    sessionStorage.removeItem(SUPERVISION_RUN_STORAGE_KEY);
  } else {
    sessionStorage.setItem(SUPERVISION_RUN_STORAGE_KEY, JSON.stringify(run));
  }
  emitClientEvent(SUPERVISION_CHANGED_EVENT);
}

export function isSupervisionBusy() {
  return readSupervisionRun() !== null;
}

export function startSupervisionRun(payload: Omit<SupervisionRun, "launched" | "officerId">) {
  setSupervisionRun({
    ...payload,
    launched: false,
  });
}

export function markSupervisionLaunched(officerId: string) {
  const run = readSupervisionRun();
  if (!run) return;
  setSupervisionRun({ ...run, launched: true, officerId });
}
