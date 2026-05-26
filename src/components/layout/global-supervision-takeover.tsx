"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSupervisionTakeover } from "@/hooks/use-supervision-takeover";

const MonitorScreen = dynamic(
  () =>
    import("@/components/screens/monitor/monitor-screen").then((mod) => ({
      default: mod.MonitorScreen,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[50vh] items-center justify-center font-bold text-amber-100">
        正在加载监督视窗…
      </div>
    ),
  }
);

/**
 * 全站接管：到点后在任意页面全屏叠放监督视窗（不依赖路由跳转）。
 */
export function GlobalSupervisionTakeover() {
  const { active } = useSupervisionTakeover();

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-svh flex-col overflow-hidden bg-stone-950"
      role="dialog"
      aria-modal="true"
      aria-label="任务监督视窗"
    >
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center font-bold text-amber-100">
            正在加载监督视窗…
          </div>
        }
      >
        <MonitorScreen />
      </Suspense>
    </div>
  );
}
