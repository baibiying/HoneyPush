"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { unlockBrowserAudio } from "@/lib/unlock-browser-audio";
import {
  YURI_PATROL_CYCLE,
  YURI_SUPERVISION_VIDEOS,
  yuriAlertVideoForStrike,
  yuriClipFromSrc,
  type YuriActiveClip,
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
  /** 当前正在播放的片段（用于控制是否开启行为检测） */
  onActiveClipChange?: (clip: YuriActiveClip) => void;
  /** 是否显示摸鱼红色提醒层（仅警示/掏枪/开枪片段为 true） */
  onDistractionBannerChange?: (visible: boolean) => void;
  /** 摸鱼片段结束，进入 idle 检测 */
  onAlertPhaseEnd?: () => void;
};

type PlaybackPhase = "waiting" | "intro" | "patrol" | "alert";

async function playVideoElement(el: HTMLVideoElement): Promise<boolean> {
  await unlockBrowserAudio();
  el.muted = false;
  el.volume = 1;

  try {
    await el.play();
    return true;
  } catch (err) {
    console.warn("[yuri-video] unmuted autoplay failed:", err);
    return false;
  }
}

export function YuriOfficerVideo({
  enrollmentReady,
  isDistracted,
  strikeCount,
  className = "",
  onIntroComplete,
  onThirdStrikeComplete,
  onVideoError,
  onActiveClipChange,
  onDistractionBannerChange,
  onAlertPhaseEnd,
}: YuriOfficerVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<PlaybackPhase>("waiting");
  const [patrolIndex, setPatrolIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const introStartedRef = useRef(false);
  const wasDistractedRef = useRef(false);
  const lastAlertStrikeRef = useRef(0);
  const phaseRef = useRef<PlaybackPhase>("waiting");
  const patrolIndexRef = useRef(0);

  phaseRef.current = phase;
  patrolIndexRef.current = patrolIndex;

  const playSrc = useCallback(
    (nextSrc: string) => {
      setSrc((prev) => (prev === nextSrc ? prev : nextSrc));
      onActiveClipChange?.(yuriClipFromSrc(nextSrc));
    },
    [onActiveClipChange]
  );

  /** 劳动态：从 idle 开始按固定顺序循环 */
  const startPatrolCycle = useCallback(() => {
    onDistractionBannerChange?.(false);
    setPhase("patrol");
    setPatrolIndex(0);
    patrolIndexRef.current = 0;
    playSrc(YURI_PATROL_CYCLE[0]);
  }, [playSrc, onDistractionBannerChange]);

  /** 摸鱼视频播完后：切 idle 继续检测 */
  const playIdleForDetection = useCallback(() => {
    onDistractionBannerChange?.(false);
    onAlertPhaseEnd?.();
    setPhase("patrol");
    setPatrolIndex(0);
    patrolIndexRef.current = 0;
    playSrc(YURI_SUPERVISION_VIDEOS.idle);
  }, [playSrc, onDistractionBannerChange, onAlertPhaseEnd]);

  const playAlertClip = useCallback(
    (alertSrc: string) => {
      onDistractionBannerChange?.(true);
      setPhase("alert");
      playSrc(alertSrc);
    },
    [playSrc, onDistractionBannerChange]
  );

  const advancePatrolCycle = useCallback(() => {
    const next = (patrolIndexRef.current + 1) % YURI_PATROL_CYCLE.length;
    patrolIndexRef.current = next;
    setPatrolIndex(next);
    playSrc(YURI_PATROL_CYCLE[next]);
  }, [playSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!src || !el) return;

    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      void playVideoElement(el);
    };

    el.addEventListener("canplay", start);
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      start();
    }

    const retryTimer = window.setTimeout(() => {
      if (cancelled || !el.paused || el.currentTime > 0.05) return;
      start();
    }, 600);

    return () => {
      cancelled = true;
      el.removeEventListener("canplay", start);
      window.clearTimeout(retryTimer);
    };
  }, [src]);

  useEffect(() => {
    if (!enrollmentReady || introStartedRef.current) return;
    introStartedRef.current = true;
    onDistractionBannerChange?.(false);
    setPhase("intro");
    playSrc(YURI_SUPERVISION_VIDEOS.intro);
  }, [enrollmentReady, playSrc, onDistractionBannerChange]);

  /** 仅按第几次摸鱼（strikeCount）选择警示 / 掏枪 / 开枪，与摸鱼原因无关 */
  useEffect(() => {
    if (!enrollmentReady || phaseRef.current === "waiting" || phaseRef.current === "intro") {
      return;
    }
    if (strikeCount <= 0 || strikeCount <= lastAlertStrikeRef.current) return;

    lastAlertStrikeRef.current = strikeCount;
    wasDistractedRef.current = true;
    const alertSrc = yuriAlertVideoForStrike(strikeCount);
    if (alertSrc) {
      playAlertClip(alertSrc);
    }
  }, [enrollmentReady, strikeCount, playAlertClip]);

  const handleEnded = useCallback(() => {
    const currentPhase = phaseRef.current;

    if (currentPhase === "intro") {
      onIntroComplete();
      startPatrolCycle();
      return;
    }

    if (currentPhase === "alert") {
      if (strikeCount >= 3) {
        onThirdStrikeComplete();
        return;
      }
      playIdleForDetection();
      return;
    }

    if (currentPhase === "patrol") {
      if (isDistracted) {
        playIdleForDetection();
        return;
      }
      advancePatrolCycle();
    }
  }, [
    isDistracted,
    strikeCount,
    onIntroComplete,
    onThirdStrikeComplete,
    startPatrolCycle,
    playIdleForDetection,
    advancePatrolCycle,
  ]);

  useEffect(() => {
    if (!enrollmentReady) {
      introStartedRef.current = false;
      wasDistractedRef.current = false;
      lastAlertStrikeRef.current = 0;
      setPhase("waiting");
      setPatrolIndex(0);
      patrolIndexRef.current = 0;
      setSrc(null);
      onActiveClipChange?.("none");
      onDistractionBannerChange?.(false);
    }
  }, [enrollmentReady, onActiveClipChange, onDistractionBannerChange]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src ?? undefined}
      playsInline
      autoPlay
      muted={false}
      preload="auto"
      onEnded={handleEnded}
      onError={onVideoError}
    />
  );
}
