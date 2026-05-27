"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Coins, ScrollText, Swords, XCircle } from "lucide-react";
import { usePerformanceReport } from "@/hooks/use-performance-report";
import { getTaskPerformanceFailureLabel, type TaskPerformanceReport } from "@/lib/task-performance";
import {
  GameScrollFrame,
  GameScrollParchment,
} from "./game-scroll-ui";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type TaskListProps = {
  items: TaskPerformanceReport["successes"] | TaskPerformanceReport["failures"];
  variant: "success" | "failure";
};

function GameTaskScroll({ items, variant }: TaskListProps) {
  if (items.length === 0) {
    return (
      <p className="text-center py-8 font-comic text-base sm:text-lg text-amber-900/55 italic">
        {variant === "success" ? "尚无通关记录，去监督局打一仗吧！" : "暂无战败记录"}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5 max-h-[min(42vh,360px)] overflow-y-auto pr-1 scroll-smooth">
      {items.map((item) => (
        <li
          key={`${variant}-${item.taskId}-${item.at}`}
          className={[
            "rounded-lg border-2 border-[#1C1917] px-4 py-3 shadow-[0_3px_0_#1C1917]",
            variant === "success"
              ? "bg-gradient-to-br from-emerald-100 to-emerald-200/90"
              : "bg-gradient-to-br from-rose-100 to-rose-200/90",
          ].join(" ")}
        >
          <p
            className={[
              "font-bangers text-lg sm:text-xl leading-snug tracking-wide",
              variant === "success" ? "text-emerald-950" : "text-rose-950",
            ].join(" ")}
          >
            {item.taskText}
          </p>
          <p className="mt-1.5 text-sm sm:text-base font-semibold text-amber-950/75">
            {variant === "success" ? "通关" : "记录"} · {formatWhen(item.at)}
          </p>
          {variant === "success" && item.coinsEarned != null ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-amber-900/25 bg-amber-300/50 px-2 py-1 text-sm sm:text-base font-bold text-amber-950">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5" />+{item.coinsEarned} 专注币
            </p>
          ) : null}
          {variant === "failure" && item.reason ? (
            <p className="mt-1.5 text-sm sm:text-base font-bold leading-snug text-rose-900">
              {getTaskPerformanceFailureLabel(item.reason)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function StatStamp({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number | string;
  tone: "emerald" | "rose" | "amber";
  icon: ReactNode;
}) {
  const toneClass =
    tone === "emerald"
      ? "from-emerald-200 to-emerald-400 border-emerald-900 text-emerald-950"
      : tone === "rose"
        ? "from-rose-200 to-rose-400 border-rose-900 text-rose-950"
        : "from-amber-200 to-amber-400 border-amber-900 text-amber-950";

  return (
    <div
      className={[
        "rounded-xl border-2 border-[#1C1917] bg-gradient-to-b p-3 sm:p-3.5 text-center shadow-[0_4px_0_#1C1917]",
        toneClass,
      ].join(" ")}
    >
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1C1917]/30 bg-white/40">
        {icon}
      </div>
      <p className="text-xs sm:text-sm font-bold opacity-90">{label}</p>
      <p className="font-bangers text-3xl sm:text-4xl leading-none mt-0.5">{value}</p>
    </div>
  );
}

type PerformancePanelProps = {
  onRequireLogin: (message: string) => void;
  canEdit: boolean;
  /** 内嵌于游戏场景时不重复包外层卷轴 */
  embedded?: boolean;
};

function PerformancePanelBody({
  onRequireLogin,
  canEdit,
}: Omit<PerformancePanelProps, "embedded">) {
  const { report, loading, canLoad } = usePerformanceReport();

  if (!canEdit) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <ScrollText className="h-12 w-12 text-amber-800/70" />
        <p className="font-comic text-base sm:text-lg font-bold text-amber-950/80">
          卷轴已封存 · 登录后展开
        </p>
        <button
          type="button"
          onClick={() => onRequireLogin("登录后即可查看表现战报。")}
          className="rounded-xl border-2 border-[#1C1917] bg-gradient-to-b from-amber-400 to-amber-500 px-5 py-2.5 font-bangers text-lg tracking-wide text-[#1C1917] shadow-[0_4px_0_#1C1917] hover:from-amber-300"
        >
          揭开卷轴
        </button>
      </div>
    );
  }

  if (!canLoad) return null;

  if (loading && !report) {
    return (
      <div className="flex min-h-[200px] items-center justify-center py-12">
        <p className="font-bangers text-2xl sm:text-3xl text-amber-900/70 animate-pulse">
          正在展开卷轴…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
        <StatStamp
          label="通关"
          value={report?.successCount ?? 0}
          tone="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatStamp
          label="战败"
          value={report?.failureCount ?? 0}
          tone="rose"
          icon={<XCircle className="h-4 w-4" />}
        />
        <StatStamp
          label="专注币"
          value={report?.totalCoins ?? 0}
          tone="amber"
          icon={<Coins className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-h-0">
        <section className="flex min-h-0 flex-col rounded-xl border-2 border-dashed border-amber-900/25 bg-amber-950/[0.04] p-3 sm:p-4">
          <h3 className="mb-3 flex shrink-0 items-center gap-2 font-bangers text-xl sm:text-2xl text-emerald-800 tracking-wide">
            <Swords className="h-5 w-5 sm:h-6 sm:w-6" />
            通关任务
          </h3>
          <GameTaskScroll items={report?.successes ?? []} variant="success" />
        </section>
        <section className="flex min-h-0 flex-col rounded-xl border-2 border-dashed border-amber-900/25 bg-amber-950/[0.04] p-3 sm:p-4">
          <h3 className="mb-3 flex shrink-0 items-center gap-2 font-bangers text-xl sm:text-2xl text-rose-800 tracking-wide">
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            战败任务
          </h3>
          <GameTaskScroll items={report?.failures ?? []} variant="failure" />
        </section>
      </div>
    </div>
  );
}

export function PerformancePanel({ onRequireLogin, canEdit, embedded = false }: PerformancePanelProps) {
  const body = <PerformancePanelBody onRequireLogin={onRequireLogin} canEdit={canEdit} />;

  if (embedded) {
    return body;
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-2 sm:p-3">
      <GameScrollFrame variant="panel" className="flex-1 min-h-0">
        <GameScrollParchment showSeal sealTitle="战绩卷轴" sealSubtitle="督蜜局 · 作战记录">
          {body}
        </GameScrollParchment>
      </GameScrollFrame>
    </div>
  );
}
