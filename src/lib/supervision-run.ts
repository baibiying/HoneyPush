import { emitClientEvent } from "@/lib/client-events";
import type { SupervisionFocusBlock } from "@/lib/supervision-blocks";

export const SUPERVISION_RUN_STORAGE_KEY = "honeypush-supervision-run-v1";
export const SUPERVISION_CHANGED_EVENT = "honeypush:supervision-changed";

export type SupervisionRun = {
  taskId: number;
  taskText: string;
  scheduledStartAt: string;
  officerId?: string;
  /** 已选监督官并启动计时/摄像头 */
  launched: boolean;
  /** 本任务全部专注 block（每段约 25 分钟） */
  focusBlocks?: SupervisionFocusBlock[];
  /** 当前正在执行的 block 下标 */
  currentBlockIndex?: number;
  /** 已成功完成的 block 下标 */
  completedBlockIndexes?: number[];
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

export function startSupervisionRun(
  payload: Omit<
    SupervisionRun,
    "launched" | "officerId" | "focusBlocks" | "currentBlockIndex" | "completedBlockIndexes"
  > & {
    focusBlocks?: SupervisionFocusBlock[];
    currentBlockIndex?: number;
    completedBlockIndexes?: number[];
  }
) {
  setSupervisionRun({
    ...payload,
    focusBlocks: payload.focusBlocks ?? [],
    currentBlockIndex: payload.currentBlockIndex ?? 0,
    completedBlockIndexes: payload.completedBlockIndexes ?? [],
    launched: false,
  });
}

export function updateSupervisionRun(patch: Partial<SupervisionRun>) {
  const run = readSupervisionRun();
  if (!run) return;
  setSupervisionRun({ ...run, ...patch });
}

export function markSupervisionLaunched(officerId: string) {
  const run = readSupervisionRun();
  if (!run) return;
  setSupervisionRun({ ...run, launched: true, officerId });
}
