"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Star,
  Trophy,
  Frown,
  Sparkles,
  Swords,
  Target,
  AlertTriangle,
  ListOrdered,
  CameraOff,
  Timer,
  Ban,
} from "lucide-react";
import type { SupervisionOutcomeModalState } from "@/lib/supervision-outcome";
import type { SupervisionOutcomeStats } from "@/lib/supervision-outcome";
import type { TaskFailureCause } from "@/lib/supervision-outcome";
import {
  getTaskFailureCauseDisplayLocalized,
  resolveTaskFailureCauseBilingual,
  translateDistractionOrHint,
} from "@/lib/monitor-i18n";
import { useI18n } from "@/i18n/i18n-provider";
import { SUPERVISION_MAX_STRIKES } from "@/lib/supervision-blocks";

type SupervisionOutcomeModalProps = {
  outcome: SupervisionOutcomeModalState | null;
  onDismiss: () => void;
  onStartBreak?: () => void;
};

function GameHudPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        "rounded-2xl border-[3px] border-[#1C1917] bg-black/35 backdrop-blur-md comic-shadow-lg",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function GameStatPill({
  label,
  value,
  accent = "amber",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "amber" | "emerald" | "rose" | "sky";
  icon?: React.ReactNode;
}) {
  const accentMap = {
    amber: "from-amber-500/40 to-orange-600/30 border-amber-300/50",
    emerald: "from-emerald-500/40 to-teal-700/30 border-emerald-300/50",
    rose: "from-rose-500/40 to-red-800/30 border-rose-300/50",
    sky: "from-sky-500/40 to-indigo-700/30 border-sky-300/50",
  };

  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-xl border-2 px-4 py-3 sm:px-5 sm:py-4 min-w-[7rem] flex-1",
        "bg-gradient-to-b",
        accentMap[accent],
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-amber-100/90 mb-1">
        {icon}
        <span className="text-xs sm:text-sm font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="font-bangers text-3xl sm:text-4xl md:text-5xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917] tabular-nums">
        {value}
      </div>
    </div>
  );
}

function DistractionBattleLog({ stats }: { stats: SupervisionOutcomeStats }) {
  const { t } = useI18n();
  const list = stats.distractions;
  const throughBlock = stats.currentBlockNumber;

  if (list.length === 0) {
    return (
      <p className="text-center text-lg sm:text-xl font-bold text-emerald-200/90 py-6">
        {throughBlock > 1
          ? t("monitor.stats.noSlackingRange", { through: throughBlock })
          : t("monitor.stats.noSlackingSingle")}
      </p>
    );
  }

  return (
    <ul className="space-y-3 max-h-[min(40vh,320px)] overflow-y-auto pr-1">
      {list.map((item, i) => (
        <li
          key={`${item.blockNumber}-${item.strikeIndexInBlock}-${i}`}
          className="flex gap-3 rounded-xl border-2 border-rose-400/40 bg-gradient-to-r from-rose-950/80 to-black/50 px-4 py-3 sm:px-5 sm:py-4"
        >
          <span className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg border-2 border-rose-300/60 bg-rose-600/50 font-bangers text-xl sm:text-2xl text-white">
            {item.strikeIndexInBlock}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-bangers text-lg sm:text-xl text-rose-200 tracking-wide">
              {t("monitor.stats.slackingEntry", {
                block: item.blockNumber,
                total: stats.totalBlocks,
                strike: item.strikeIndexInBlock,
              })}
            </p>
            <p className="mt-1 text-base sm:text-lg font-bold text-white/95 leading-snug">
              {translateDistractionOrHint(item.reason, t)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const FAILURE_CAUSE_ICON: Record<
  TaskFailureCause,
  React.ComponentType<{ className?: string }>
> = {
  "strikes-exhausted": AlertTriangle,
  "camera-closed": CameraOff,
  "enrollment-timeout": Timer,
  cancelled: Ban,
  other: Frown,
};

function FailureCausePanel({
  failReason,
}: {
  failReason: string;
}) {
  const { t } = useI18n();
  const cause = resolveTaskFailureCauseBilingual(failReason);
  const display = getTaskFailureCauseDisplayLocalized(cause, t);
  const CauseIcon = FAILURE_CAUSE_ICON[cause];

  return (
    <GameHudPanel className="p-5 sm:p-6 border-rose-400/60 bg-gradient-to-br from-rose-950/90 via-red-950/70 to-black/60">
      <p className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-rose-200/80 mb-3">
        {t("monitor.stats.failReasonTitle")}
      </p>
      <div className="flex gap-4 sm:gap-5 items-start">
        <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl border-[3px] border-rose-300/50 bg-rose-600/40 comic-shadow">
          <CauseIcon className="h-8 w-8 sm:h-9 sm:w-9 text-rose-100" />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-bangers text-2xl sm:text-3xl md:text-4xl text-rose-100 tracking-wide leading-tight">
            {display.headline}
          </p>
          <p className="mt-2 text-base sm:text-lg md:text-xl font-bold text-white/95 leading-relaxed">
            {display.summary}
          </p>
          {failReason !== display.headline && (
            <p className="mt-3 rounded-lg border border-rose-400/30 bg-black/30 px-3 py-2 text-sm sm:text-base text-rose-100/90">
              {t("monitor.systemRecord", { reason: failReason })}
            </p>
          )}
        </div>
      </div>
    </GameHudPanel>
  );
}

function GameOutcomeStats({ stats, showCoins }: { stats: SupervisionOutcomeStats; showCoins?: boolean }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
        <GameStatPill
          label={t("monitor.stats.block")}
          value={
            <>
              {stats.currentBlockNumber}
              <span className="text-2xl sm:text-3xl opacity-80">/{stats.totalBlocks}</span>
            </>
          }
          accent="sky"
          icon={<Target className="h-4 w-4" />}
        />
        <GameStatPill
          label={t("monitor.stats.slackingBlock")}
          value={stats.distractionsInBlock}
          accent="rose"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <GameStatPill
          label={t("monitor.stats.slackingTotal")}
          value={stats.distractionsCumulative}
          accent="rose"
          icon={<ListOrdered className="h-4 w-4" />}
        />
        <GameStatPill
          label={t("monitor.stats.starsLeft")}
          value={
            <span className="inline-flex items-center gap-2">
              {stats.starsRemaining}
              <span className="text-2xl sm:text-3xl opacity-80">/{SUPERVISION_MAX_STRIKES}</span>
            </span>
          }
          accent="amber"
          icon={<Star className="h-4 w-4 fill-amber-300" />}
        />
        <GameStatPill
          label={t("monitor.stats.starsEarned")}
          value={stats.starsEarnedCumulative}
          accent="amber"
          icon={<Sparkles className="h-4 w-4 text-amber-200" />}
        />
      </div>

      <GameHudPanel className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 border-b-2 border-white/15 pb-3">
          <Swords className="h-5 w-5 text-rose-300" />
          <div className="min-w-0">
            <h3 className="font-bangers text-2xl sm:text-3xl text-rose-100 tracking-wide">
              {t("monitor.stats.battleLog")}
            </h3>
            {stats.currentBlockNumber > 1 && (
              <p className="text-xs sm:text-sm font-bold text-rose-200/70">
                {t("monitor.stats.cumulativeThrough", { through: stats.currentBlockNumber })}
              </p>
            )}
          </div>
          <span className="ml-auto font-mono text-sm sm:text-base font-bold text-rose-200/80 tabular-nums shrink-0">
            {t("monitor.stats.totalTimes", { count: stats.distractionsCumulative })}
          </span>
        </div>
        <DistractionBattleLog stats={stats} />
      </GameHudPanel>

      {showCoins && stats.coinsEarned != null && (
        <GameHudPanel
          className={[
            "p-4 sm:p-5 text-center border-amber-400/50",
            stats.coinsEarned > 0
              ? "bg-gradient-to-b from-amber-500/25 to-transparent"
              : "bg-gradient-to-b from-stone-500/20 to-transparent border-stone-500/40",
          ].join(" ")}
        >
          <p className="text-sm font-black uppercase tracking-widest text-amber-200/90">
            {t("monitor.stats.loot")}
          </p>
          <p
            className={[
              "font-bangers text-4xl sm:text-5xl mt-1",
              stats.coinsEarned > 0 ? "text-amber-300" : "text-stone-400",
            ].join(" ")}
          >
            {t("monitor.stats.coins", { count: stats.coinsEarned })}
          </p>
          {stats.coinsEarned === 0 && (
            <p className="mt-2 text-sm font-bold text-stone-400">{t("monitor.stats.noCoins")}</p>
          )}
        </GameHudPanel>
      )}
    </div>
  );
}

export function SupervisionOutcomeModal({
  outcome,
  onDismiss,
  onStartBreak,
}: SupervisionOutcomeModalProps) {
  const { t } = useI18n();

  if (!outcome) return null;

  const isSuccess =
    outcome.kind === "block-success" || outcome.kind === "task-success";
  const Icon = isSuccess ? Trophy : Frown;

  let title = "";
  let subtitle = "";
  let primaryLabel = t("monitor.gotIt");
  let onPrimary = onDismiss;
  let headerGradient = isSuccess
    ? "from-emerald-600 via-emerald-700 to-teal-900"
    : "from-rose-600 via-red-700 to-rose-950";

  switch (outcome.kind) {
    case "block-success": {
      title = t("monitor.outcome.blockSuccessTitle");
      const breakMin = Math.max(1, Math.ceil(outcome.breakSecondsUntilNext / 60));
      if (outcome.breakSecondsUntilNext > 0) {
        subtitle = t("monitor.outcome.blockSuccessBreak", {
          block: outcome.stats.currentBlockNumber,
          breakMin,
          nextLabel: outcome.nextBlockLabel,
          startTime: outcome.nextBlockStartLabel,
        });
        primaryLabel = t("monitor.outcome.startBreak");
        onPrimary = onStartBreak ?? onDismiss;
      } else {
        subtitle = t("monitor.outcome.blockSuccessImmediate", {
          block: outcome.stats.currentBlockNumber,
        });
        primaryLabel = t("monitor.outcome.startNextBlock");
        onPrimary = onStartBreak ?? onDismiss;
      }
      headerGradient = "from-emerald-500 via-emerald-600 to-teal-900";
      break;
    }
    case "block-fail":
      title = t("monitor.outcome.blockFailTitle");
      subtitle = t("monitor.outcome.blockFailSubtitle");
      break;
    case "task-success":
      title = t("monitor.outcome.taskSuccessTitle");
      subtitle = t("monitor.outcome.taskSuccessSubtitle", {
        total: outcome.stats.totalBlocks,
      });
      headerGradient = "from-amber-500 via-emerald-600 to-teal-900";
      break;
    case "task-fail":
      title = t("monitor.outcome.taskFailTitle");
      subtitle = t("monitor.outcome.taskFailSubtitle");
      break;
  }

  const showFailureCause =
    outcome.kind === "block-fail" || outcome.kind === "task-fail";
  const failureReason =
    outcome.kind === "block-fail" || outcome.kind === "task-fail"
      ? outcome.failReason
      : "";

  const showStats =
    outcome.kind === "task-success" ||
    outcome.kind === "task-fail" ||
    outcome.kind === "block-fail" ||
    outcome.kind === "block-success";
  const showCoins =
    outcome.kind === "task-success" || outcome.kind === "block-fail";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10050] flex flex-col overflow-hidden"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="supervision-outcome-title"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.45), transparent)",
              "radial-gradient(ellipse 60% 40% at 80% 100%, rgba(244,63,94,0.25), transparent)",
              "radial-gradient(white 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "100% 100%, 100% 100%, 24px 24px",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-violet-950/95 to-[#1a0a14]" aria-hidden />

        <header
          className={[
            "relative shrink-0 border-b-4 border-[#1C1917] px-6 py-6 sm:py-8 bg-gradient-to-r",
            headerGradient,
          ].join(" ")}
        >
          <div className="mx-auto flex max-w-4xl items-center gap-4 sm:gap-6">
            <span className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#1C1917] bg-black/25 comic-shadow">
              <Icon className="h-9 w-9 sm:h-11 sm:w-11 text-white" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <h1
                id="supervision-outcome-title"
                className="font-bangers text-4xl sm:text-5xl md:text-6xl text-white tracking-wide leading-none drop-shadow-[0_3px_0_#1C1917]"
              >
                {title}
                {outcome.kind === "block-success" && (
                  <Sparkles className="inline h-8 w-8 sm:h-10 sm:w-10 text-amber-200 ml-2 align-middle" />
                )}
              </h1>
              <p className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-white/90 leading-snug max-w-2xl">
                {subtitle}
              </p>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
            <GameHudPanel className="p-4 sm:p-6 border-amber-400/30">
              <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-amber-200/70">
                {t("monitor.currentTask")}
              </p>
              <p className="mt-1 font-bangers text-2xl sm:text-3xl md:text-4xl text-white tracking-wide leading-tight">
                {outcome.stats.taskText}
              </p>
              <p className="mt-2 text-base sm:text-lg font-bold text-violet-200/90">
                {t("monitor.officerLine", { name: outcome.stats.officerName })}
              </p>
            </GameHudPanel>

            {outcome.kind === "block-success" && outcome.breakSecondsUntilNext > 0 && (
              <GameHudPanel className="p-4 sm:p-5 border-amber-400/50 bg-amber-500/15 text-center">
                <p className="font-bangers text-2xl sm:text-3xl text-amber-200">
                  {t("monitor.outcome.intermission")}
                </p>
                <p className="mt-2 text-lg sm:text-xl font-bold text-white/90">
                  {t("monitor.outcome.intermissionCountdown", {
                    minutes: Math.ceil(outcome.breakSecondsUntilNext / 60),
                    startTime: outcome.nextBlockStartLabel,
                  })}
                </p>
              </GameHudPanel>
            )}

            {showFailureCause && <FailureCausePanel failReason={failureReason} />}

            {showStats && (
              <GameOutcomeStats stats={outcome.stats} showCoins={showCoins} />
            )}

            {"recordSaved" in outcome && !outcome.recordSaved && (
              <p className="text-center text-base sm:text-lg font-bold text-amber-300">
                {t("monitor.recordSaveFailed")}
              </p>
            )}
          </div>
        </main>

        <footer className="relative shrink-0 border-t-4 border-[#1C1917] bg-black/50 px-4 py-4 sm:py-6 backdrop-blur-md">
          <div className="mx-auto max-w-4xl">
            <button
              type="button"
              onClick={onPrimary}
              className={[
                "w-full py-4 sm:py-5 font-bangers text-2xl sm:text-3xl md:text-4xl tracking-wider",
                "border-[3px] border-[#1C1917] comic-shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]",
                isSuccess
                  ? "bg-gradient-to-b from-emerald-400 to-emerald-700 text-white"
                  : "bg-gradient-to-b from-rose-500 to-rose-800 text-white",
              ].join(" ")}
            >
              {primaryLabel}
            </button>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
