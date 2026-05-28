"use client";

import { useEffect } from "react";
import { handleGameSfxClick } from "@/lib/game-sfx";
import { unlockBrowserAudioSync } from "@/lib/unlock-browser-audio";

/** 全局游戏 UI 音效：按钮点击（事件委托） */
export function GameSfxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const primeAudio = () => {
      unlockBrowserAudioSync();
    };

    document.addEventListener("pointerdown", primeAudio, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", handleGameSfxClick, true);

    return () => {
      document.removeEventListener("pointerdown", primeAudio, true);
      document.removeEventListener("click", handleGameSfxClick, true);
    };
  }, []);

  return children;
}
