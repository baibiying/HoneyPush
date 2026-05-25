"use client";

import { useEffect, useState } from "react";
import {
  SUPERVISION_CHANGED_EVENT,
  isSupervisionBusy,
} from "@/lib/supervision-run";

export function useSupervisionBusy() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setBusy(isSupervisionBusy());
    sync();

    window.addEventListener(SUPERVISION_CHANGED_EVENT, sync);
    const id = window.setInterval(sync, 1000);
    return () => {
      window.removeEventListener(SUPERVISION_CHANGED_EVENT, sync);
      window.clearInterval(id);
    };
  }, []);

  return busy;
}
