"use client";

import { useEffect, useState } from "react";
import {
  SUPERVISION_TAKEOVER_EVENT,
  isSupervisionTakeoverActive,
  readSupervisionTakeover,
  type SupervisionTakeoverState,
} from "@/lib/supervision-takeover";

export function useSupervisionTakeover() {
  const [state, setState] = useState<SupervisionTakeoverState | null>(null);

  useEffect(() => {
    const sync = () => setState(readSupervisionTakeover());
    sync();

    window.addEventListener(SUPERVISION_TAKEOVER_EVENT, sync);
    return () => window.removeEventListener(SUPERVISION_TAKEOVER_EVENT, sync);
  }, []);

  return {
    active: state !== null,
    taskId: state?.taskId ?? null,
    isTakeoverActive: isSupervisionTakeoverActive,
  };
}
