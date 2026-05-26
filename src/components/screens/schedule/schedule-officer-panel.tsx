"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Shield } from "lucide-react";
import { OFFICERS, type OfficerId } from "@/lib/officers-data";
import { setPreferredOfficer } from "@/lib/preferred-officer";
import { OfficerAvatar } from "@/components/screens/monitor/officer-avatar";

type ScheduleOfficerPanelProps = {
  selectedId: OfficerId | null;
  canEdit: boolean;
  onSelected: (id: OfficerId) => void;
  onRequireLogin: (message: string) => void;
};

export function ScheduleOfficerPanel({
  selectedId,
  canEdit,
  onSelected,
  onRequireLogin,
}: ScheduleOfficerPanelProps) {
  const [savedFlash, setSavedFlash] = useState(false);

  const handlePick = (id: OfficerId) => {
    if (!canEdit) {
      onRequireLogin("登录后才能保存监督官选择。");
      return;
    }
    setPreferredOfficer(id);
    onSelected(id);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
      <div className="rounded-xl border-2 border-amber-400/40 bg-amber-500/15 px-3 py-2.5 flex gap-2.5">
        <Shield className="h-5 w-5 shrink-0 text-amber-200 mt-0.5" strokeWidth={2.5} aria-hidden />
        <p className="text-xs sm:text-sm font-bold text-amber-50 leading-relaxed">
          在此选定默认监督官。任务到点后将<strong className="text-white">直接进入监督</strong>
          ，自动开启摄像头，无需再次选择。
        </p>
      </div>

      {savedFlash && (
        <p className="flex items-center gap-2 rounded-lg border-2 border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-sm font-bold text-emerald-100">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          已保存，到点将由此监督官执勤
        </p>
      )}

      <div className="space-y-3">
        {OFFICERS.map((officer) => {
          const isSelected = officer.id === selectedId;
          return (
            <motion.button
              key={officer.id}
              type="button"
              onClick={() => handlePick(officer.id)}
              whileTap={{ scale: 0.98 }}
              className={[
                "w-full text-left p-3 sm:p-4 rounded-xl border-[3px] transition-all",
                isSelected
                  ? "border-[#1C1917] bg-white ring-4 ring-amber-400/80 shadow-[0_4px_0_#1C1917]"
                  : "border-[#1C1917]/70 bg-white/90 hover:bg-white shadow-[0_3px_0_#1C1917] opacity-90 hover:opacity-100",
              ].join(" ")}
              style={{ borderLeftWidth: 6, borderLeftColor: officer.color }}
            >
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 border-2 border-[#1C1917] overflow-hidden bg-stone-900">
                  <OfficerAvatar id={officer.id} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bangers text-lg sm:text-xl text-[#1C1917] tracking-wide truncate">
                      {officer.name}
                    </h3>
                    {isSelected && (
                      <span className="shrink-0 bg-amber-400 text-[#1C1917] text-[10px] px-2 py-0.5 font-black border-2 border-[#1C1917]">
                        默认
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-neutral-600">{officer.title}</p>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-neutral-700 italic leading-snug line-clamp-2 bg-neutral-100/80 px-1.5 py-1 border border-dashed border-neutral-400 rounded">
                    {officer.slogan}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
