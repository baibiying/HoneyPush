"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { unlockBrowserAudio } from "@/lib/unlock-browser-audio";
import {
  YURI_PATROL_CYCLE,
  YURI_SUPERVISION_VIDEOS,
  yuriAlertVideoForStrike,
} from "@/lib/officers/yuri-supervision-videos";

type YuriOfficerVideoProps = {
  /** 人脸采集完成，可播开场白 */
  enrollmentReady: boolean;
  isDistracted: boolean;
  /** 当前摸鱼次数 1～3（由父组件累计） */
  strikeCount: number;
  className?: string;
  onIntroComplete: () => void;
  /** 第三次摸鱼「开枪」播完 */
  onThirdStrikeComplete: () => void;
  onVideoError?: () => void;
};

type PlaybackPhase = "waiting" | "intro" | "patrol" | "alert";

export function YuriOfficerVideo({
  enrollmentReady,
  isDistracted,
  strikeCount,
  className = "",
  onIntroComplete,
  onThirdStrikeComplete,
  onVideoError,
}: YuriOfficerVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<PlaybackPhase>("waiting");
  const [patrolIndex, setPatrolIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const introStartedRef = useRef(false);

  const playSrc = useCallback((nextSrc: string) => {
    setSrc(nextSrc);
    const el = videoRef.current;
    if (!el) return;
    if (el.src !== nextSrc && !el.src.endsWith(nextSrc)) {
      el.src = nextSrc;
    }
    el.muted = false;
    el.volume = 1;
    el.load();
    void unlockBrowserAudio().then(() => el.play()).catch(() => {});
  }, []);

  useEffect(() => {
    if (!enrollmentReady || introStartedRef.current) return;
    introStartedRef.current = true;
    setPhase("intro");
    playSrc(YURI_SUPERVISION_VIDEOS.intro);
  }, [enrollmentReady, playSrc]);

  useEffect(() => {
    if (!enrollmentReady || phase === "waiting" || phase === "intro") return;

    if (isDistracted && strikeCount > 0) {
      const alertSrc = yuriAlertVideoForStrike(strikeCount);
      if (alertSrc && phase !== "alert") {
        setPhase("alert");
        playSrc(alertSrc);
      } else if (alertSrc && src !== alertSrc) {
        playSrc(alertSrc);
      }
      return;
    }

    if (phase !== "patrol") {
      setPhase("patrol");
      const start = patrolIndex % YURI_PATROL_CYCLE.length;
      playSrc(YURI_PATROL_CYCLE[start]);
    }
  }, [
    enrollmentReady,
    isDistracted,
    strikeCount,
    phase,
    patrolIndex,
    playSrc,
    src,
  ]);

  const handleEnded = useCallback(() => {
    if (phase === "intro") {
      setPhase("patrol");
      setPatrolIndex(0);
      playSrc(YURI_PATROL_CYCLE[0]);
      onIntroComplete();
      return;
    }

    if (phase === "alert") {
      if (strikeCount >= 3) {
        onThirdStrikeComplete();
        return;
      }
      if (isDistracted) {
        const again = yuriAlertVideoForStrike(strikeCount);
        if (again) playSrc(again);
        return;
      }
      setPhase("patrol");
      playSrc(YURI_PATROL_CYCLE[patrolIndex % YURI_PATROL_CYCLE.length]);
      return;
    }

    if (phase === "patrol" && !isDistracted) {
      const next = (patrolIndex + 1) % YURI_PATROL_CYCLE.length;
      setPatrolIndex(next);
      playSrc(YURI_PATROL_CYCLE[next]);
    }
  }, [
    phase,
    patrolIndex,
    isDistracted,
    strikeCount,
    playSrc,
    onIntroComplete,
    onThirdStrikeComplete,
  ]);

  useEffect(() => {
    if (!enrollmentReady) {
      introStartedRef.current = false;
      setPhase("waiting");
      setPatrolIndex(0);
      setSrc(null);
    }
  }, [enrollmentReady]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src ?? undefined}
      playsInline
      muted={false}
      preload="auto"
      onEnded={handleEnded}
      onError={onVideoError}
    />
  );
}
