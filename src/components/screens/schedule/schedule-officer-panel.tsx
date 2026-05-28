"use client";

import { useEffect, useState } from "react";
import { preloadOfficerPanelVideos } from "@/lib/officers/preload-officer-videos";
import { motion } from "framer-motion";
import { Check, Shield, Sparkles } from "lucide-react";
import { OFFICERS, type Officer, type OfficerId } from "@/lib/officers-data";
import { setPreferredOfficer } from "@/lib/preferred-officer";
import { OfficerAvatar } from "@/components/screens/monitor/officer-avatar";
import { useI18n } from "@/i18n/i18n-provider";
import { OfficerVideoPreview } from "./officer-video-preview";

type ScheduleOfficerPanelProps = {
  selectedId: OfficerId | null;
  canEdit: boolean;
  onSelected: (id: OfficerId) => void;
  onRequireLogin: (message: string) => void;
};

const CARD_FRAME = "rounded-xl border-[3px] border-[#1c1917] shadow-[0_6px_0_#1c1917]";

function OfficerCharacterCard({
  officer,
  isSelected,
  disabled,
  onPick,
}: {
  officer: Officer;
  isSelected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const { t } = useI18n();

  return (
    <motion.div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onPick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      whileHover={disabled ? undefined : { y: -6, scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={[
        "group relative w-full text-left transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer",
      ].join(" ")}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      aria-label={t("officer.selectAria", { name: officer.name })}
    >
      <div
        className={[
          "relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-amber-100/90",
          CARD_FRAME,
          isSelected ? "ring-4 ring-amber-400/90 ring-offset-2 ring-offset-transparent" : "",
        ].join(" ")}
      >
        {/* 顶部角色色条 */}
        <div
          className="h-2.5 border-b-2 border-[#1c1917]"
          style={{ background: `linear-gradient(90deg, ${officer.color}, ${officer.color}88)` }}
        />

        {/* 角标 */}
        <div className="absolute top-4 left-3 z-10 flex items-center gap-1.5 rounded-md border-2 border-[#1c1917] bg-black/85 px-2 py-1">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-300" strokeWidth={2.5} aria-hidden />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-100">
            {t("officer.badge")}
          </span>
        </div>

        {isSelected ? (
          <div className="absolute top-4 right-3 z-10 flex items-center gap-1.5 rounded-md border-2 border-[#1c1917] bg-amber-400 px-2.5 py-1 shadow-[0_2px_0_#1c1917]">
            <Check className="h-4 w-4 text-[#1c1917]" strokeWidth={3} aria-hidden />
            <span className="text-xs sm:text-sm font-black text-[#1c1917]">{t("officer.enlisted")}</span>
          </div>
        ) : (
          <div className="absolute top-4 right-3 z-10 rounded-md border-2 border-dashed border-[#1c1917]/50 bg-white/70 px-2.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-xs sm:text-sm font-bold text-neutral-600">{t("officer.recruit")}</span>
          </div>
        )}

        {/* 立绘区 */}
        <div className="relative mx-3 mt-3 sm:mx-4">
          <div
            className="pointer-events-none absolute -inset-1 rounded-lg opacity-60 blur-md transition-opacity group-hover:opacity-90"
            style={{ background: `radial-gradient(circle at 50% 70%, ${officer.color}55, transparent 70%)` }}
            aria-hidden
          />
          <div
            className={[
              "relative aspect-[3/4] overflow-hidden border-[3px] border-[#1c1917] bg-[#1c1917]",
              "shadow-[inset_0_-12px_24px_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            <OfficerAvatar id={officer.id} />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center"
              aria-hidden
            >
              <span
                className="rounded-md border-2 border-[#1c1917] px-3.5 py-2 text-base sm:text-lg font-black text-white shadow-[0_2px_0_#1c1917] leading-snug text-center max-w-full"
                style={{ backgroundColor: officer.color }}
              >
                {officer.title}
              </span>
            </div>
          </div>
        </div>

        {/* 角色信息 */}
        <div className="space-y-3 p-3 pt-3 sm:p-4 sm:pt-3">
          <div>
            <h3 className="font-bangers text-3xl sm:text-4xl leading-none tracking-wide text-[#1c1917] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
              {officer.name}
            </h3>
          </div>

          <OfficerVideoPreview officer={officer} />

          {/* 台词气泡 */}
          <div className="relative rounded-lg border-2 border-[#1c1917] bg-white px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-[0_3px_0_#1c1917]">
            <span
              className="absolute -top-2 left-4 h-3 w-3 rotate-45 border-l-2 border-t-2 border-[#1c1917] bg-white"
              aria-hidden
            />
            <p className="text-sm sm:text-base font-comic font-bold leading-relaxed text-neutral-800">
              「{officer.slogan}」
            </p>
          </div>

          <div
            className={[
              "mt-1 w-full rounded-lg border-2 border-[#1c1917] py-2.5 sm:py-3 text-center text-sm sm:text-base font-black transition-colors",
              isSelected
                ? "bg-amber-400 text-[#1c1917] shadow-[0_3px_0_#1c1917]"
                : "bg-[#1c1917] text-amber-100 group-hover:bg-neutral-800",
            ].join(" ")}
          >
            {isSelected ? t("officer.current") : t("officer.choose")}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ScheduleOfficerPanel({
  selectedId,
  canEdit,
  onSelected,
  onRequireLogin,
}: ScheduleOfficerPanelProps) {
  const { t } = useI18n();
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    preloadOfficerPanelVideos(selectedId);
  }, [selectedId]);

  const handlePick = (id: OfficerId) => {
    if (!canEdit) {
      onRequireLogin(t("prompts.saveOfficer"));
      return;
    }
    setPreferredOfficer(id);
    onSelected(id);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
      <div className="rounded-xl border-2 border-amber-400/40 bg-amber-500/15 px-4 py-3 sm:px-5 sm:py-3.5 flex gap-3">
        <Shield className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-amber-200 mt-0.5" strokeWidth={2.5} aria-hidden />
        <p className="text-sm sm:text-base font-bold text-amber-50 leading-relaxed">
          {t("officer.intro").split(t("officer.introStrong")).map((part, index, parts) =>
            index < parts.length - 1 ? (
              <span key={index}>
                {part}
                <strong className="text-white">{t("officer.introStrong")}</strong>
              </span>
            ) : (
              <span key={index}>{part}</span>
            ),
          )}
        </p>
      </div>

      {savedFlash && (
        <p className="flex items-center gap-2 rounded-lg border-2 border-emerald-400/50 bg-emerald-500/20 px-3 py-2.5 text-sm sm:text-base font-bold text-emerald-100">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {t("officer.saved")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFFICERS.map((officer, index) => (
          <motion.div
            key={officer.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
          >
            <OfficerCharacterCard
              officer={officer}
              isSelected={officer.id === selectedId}
              disabled={!canEdit}
              onPick={() => handlePick(officer.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
