"use client";

import { Coffee } from "lucide-react";
import { formatCountdownSeconds } from "@/lib/supervision-blocks";

type SupervisionBreakOverlayProps = {
  nextBlockLabel: string;
  nextBlockStartLabel: string;
  secondsRemaining: number;
};

export function SupervisionBreakOverlay({
  nextBlockLabel,
  nextBlockStartLabel,
  secondsRemaining,
}: SupervisionBreakOverlayProps) {
  const canStart = secondsRemaining <= 0;

  return (
    <div
      className="absolute inset-0 z-[10040] flex items-center justify-center p-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md comic-border-2 border-amber-400 bg-[#FAF4D3] px-5 py-6 text-center comic-shadow-lg pointer-events-auto">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#1C1917] bg-amber-200">
          <Coffee className="h-6 w-6 text-amber-900" />
        </div>
        <p className="font-bangers text-2xl text-amber-900 tracking-wide">段间休息中</p>
        <p className="mt-2 text-sm text-neutral-800 leading-relaxed">
          按番茄钟规则，下一段专注前有 5 分钟休息。放松一下，到点会自动开始监督。
        </p>
        <p className="mt-4 font-mono text-4xl font-black tabular-nums text-[#1C1917]">
          {canStart ? "00:00" : formatCountdownSeconds(secondsRemaining)}
        </p>
        <p className="mt-3 text-xs font-bold text-neutral-600">
          {canStart
            ? `${nextBlockLabel} 可以开始了，正在为你准备…`
            : `${nextBlockLabel} 将于 ${nextBlockStartLabel} 开始`}
        </p>
      </div>
    </div>
  );
}
