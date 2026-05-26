"use client";

import type { ReactNode } from "react";
import { useSupervisionTakeover } from "@/hooks/use-supervision-takeover";

/** 监督接管时隐藏路由页面，仅显示全屏监督层 */
export function MainContentShell({ children }: { children: ReactNode }) {
  const { active } = useSupervisionTakeover();

  if (active) return null;

  return <>{children}</>;
}
