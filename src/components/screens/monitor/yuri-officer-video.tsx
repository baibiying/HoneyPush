"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useI18n } from "@/i18n/i18n-provider";
import { playVideoRobust } from "@/lib/media-playback";
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
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<PlaybackPhase>("waiting");
  const [patrolIndex, setPatrolIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [needsTapPlay, setNeedsTapPlay] = useState(false);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const introStartedRef = useRef(false);
  const wasDistractedRef = useRef(false);
  const lastAlertStrikeRef = useRef(0);
  const phaseRef = useRef<PlaybackPhase>("waiting");
  const patrolIndexRef = useRef(0);

  phaseRef.current = phase;
  patrolIndexRef.current = patrolIndex;

  const playSrc = useCallback(
    (nextSrc: string) => {
      setNeedsTapPlay(false);
      setNeedsUnmute(false);
      setBuffering(true);
      setSrc((prev) => (prev === nextSrc ? prev : nextSrc));
      onActiveClipChange?.(yuriClipFromSrc(nextSrc));
    },
    [onActiveClipChange]
  );

  const attemptPlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el || !src) return;
    const result = await playVideoRobust(el);
    if (result === "unmuted") {
      setNeedsTapPlay(false);
      setNeedsUnmute(false);
      setBuffering(false);
      return;
    }
    if (result === "muted") {
      setNeedsTapPlay(false);
      setNeedsUnmute(true);
      setBuffering(false);
      return;
    }
    setNeedsTapPlay(true);
    setBuffering(false);
  }, [src]);

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

    const onCanPlay = () => {
      if (cancelled) return;
      void attemptPlay();
    };

    const onWaiting = () => {
      if (!cancelled) setBuffering(true);
    };

    const onPlaying = () => {
      if (!cancelled) setBuffering(false);
    };

    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);

    try {
      el.load();
    } catch {
      /* ignore */
    }

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      void attemptPlay();
    }

    const retryTimer = window.setTimeout(() => {
      if (cancelled || !el.paused || el.currentTime > 0.05) return;
      void attemptPlay();
    }, 800);

    const slowTimer = window.setTimeout(() => {
      if (cancelled || !el.paused || el.currentTime > 0.05) return;
      setNeedsTapPlay(true);
      setBuffering(false);
    }, 12_000);

    return () => {
      cancelled = true;
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      window.clearTimeout(retryTimer);
      window.clearTimeout(slowTimer);
    };
  }, [src, attemptPlay]);

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
      setBuffering(false);
      setNeedsTapPlay(false);
      setNeedsUnmute(false);
      onActiveClipChange?.("none");
      onDistractionBannerChange?.(false);
    }
  }, [enrollmentReady, onActiveClipChange, onDistractionBannerChange]);

  const handleManualPlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    void (async () => {
      const result = await playVideoRobust(el, { allowMutedFallback: false });
      if (result === "unmuted") {
        setNeedsTapPlay(false);
        setNeedsUnmute(false);
        return;
      }
      const mutedResult = await playVideoRobust(el);
      if (mutedResult !== "failed") {
        setNeedsTapPlay(false);
        setNeedsUnmute(mutedResult === "muted");
      }
    })();
  }, []);

  const handleUnmute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    void playVideoRobust(el, { allowMutedFallback: false }).then((result) => {
      if (result === "unmuted") setNeedsUnmute(false);
    });
  }, []);

  const showOverlay = Boolean(src) && (buffering || needsTapPlay || needsUnmute);

  return (
    <div className="relative h-full w-full min-h-0">
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

      {showOverlay && (
        <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-3 bg-black/55 px-4 text-center pointer-events-auto">
          {buffering && !needsTapPlay && (
            <p className="font-comic text-sm sm:text-base text-amber-100/95 animate-pulse">
              {t("monitor.video.loading")}
            </p>
          )}
          {needsTapPlay && (
            <>
              <p className="font-comic text-sm sm:text-base text-amber-100/90 max-w-xs">
                {t("monitor.video.tapToPlayHint")}
              </p>
              <button
                type="button"
                onClick={handleManualPlay}
                className="comic-border-2 border-amber-400 bg-amber-950/90 px-4 py-2.5 text-sm font-bold text-amber-100 hover:bg-amber-900 flex items-center gap-2 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden />
                {t("monitor.video.tapToPlay")}
              </button>
            </>
          )}
          {needsUnmute && !needsTapPlay && (
            <button
              type="button"
              onClick={handleUnmute}
              className="comic-border-2 border-cyan-400 bg-cyan-950/90 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-900 cursor-pointer"
            >
              {t("monitor.video.tapForSound")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
