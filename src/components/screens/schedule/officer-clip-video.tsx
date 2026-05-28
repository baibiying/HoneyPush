"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { OFFICER_CLIP_MAX_DURATION_SEC } from "@/lib/officers-data";
import { playVideoRobust } from "@/lib/media-playback";

type OfficerClipVideoProps = {
  src: string;
  startSec?: number;
  /** 未设置则从开始时间播到视频结束 */
  durationSec?: number;
  loop?: boolean;
  autoPlay?: boolean;
  /** 仅对「非片段」模式生效；片段模式使用自定义控制条 */
  controls?: boolean;
  className?: string;
  /** 片段模式是否显示底部控制条（监督警报全屏时不显示） */
  showClipControls?: boolean;
  onError?: () => void;
};

function formatClipTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function OfficerClipVideo({
  src,
  startSec = 0,
  durationSec,
  loop = false,
  autoPlay = false,
  controls = true,
  className = "",
  showClipControls = true,
  onError,
}: OfficerClipVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [clipProgress, setClipProgress] = useState(0);
  const [needsTapPlay, setNeedsTapPlay] = useState(false);
  const [buffering, setBuffering] = useState(false);

  const clipDurationSec = useMemo(() => {
    if (durationSec == null || durationSec <= 0) return null;
    return Math.min(durationSec, OFFICER_CLIP_MAX_DURATION_SEC);
  }, [durationSec]);

  const isClipped = clipDurationSec != null;
  const endSec = isClipped ? startSec + clipDurationSec : null;

  const clampToClip = useCallback(
    (el: HTMLVideoElement) => {
      if (endSec == null) return;
      if (el.currentTime < startSec || Number.isNaN(el.currentTime)) {
        el.currentTime = startSec;
      } else if (el.currentTime >= endSec) {
        if (loop) {
          el.currentTime = startSec;
        } else {
          el.currentTime = startSec;
          el.pause();
          setPlaying(false);
        }
      }
      setClipProgress(Math.min(clipDurationSec!, Math.max(0, el.currentTime - startSec)));
    },
    [clipDurationSec, endSec, loop, startSec]
  );

  const seekToStart = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.currentTime = startSec;
      setClipProgress(0);
    } catch {
      /* ignore */
    }
  }, [startSec]);

  const playWithSound = useCallback(async (el: HTMLVideoElement) => {
    const result = await playVideoRobust(el);
    if (result === "failed") {
      setNeedsTapPlay(true);
      setBuffering(false);
      return;
    }
    setNeedsTapPlay(false);
    setBuffering(false);
  }, []);

  const handlePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (endSec != null && el.currentTime >= endSec - 0.05) {
      el.currentTime = startSec;
    }
    void playWithSound(el);
  }, [endSec, playWithSound, startSec]);

  const handlePause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) handlePlay();
    else handlePause();
  }, [handlePause, handlePlay]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    clampToClip(el);
  }, [clampToClip]);

  const handleSeeking = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    clampToClip(el);
  }, [clampToClip]);

  const handleLoadedData = useCallback(() => {
    seekToStart();
  }, [seekToStart]);

  const handlePlayEvent = () => setPlaying(true);
  const handlePauseEvent = () => setPlaying(false);

  useEffect(() => {
    if (!autoPlay) return;
    const el = videoRef.current;
    if (!el) return;
    setBuffering(true);
    setNeedsTapPlay(false);
    seekToStart();
    const tryPlay = () => void playWithSound(el);
    void tryPlay();
    const slowTimer = window.setTimeout(() => {
      if (el.paused && el.currentTime < 0.05) setNeedsTapPlay(true);
      setBuffering(false);
    }, 12_000);
    if (el.readyState < 2) {
      el.addEventListener("loadeddata", tryPlay, { once: true });
      return () => {
        el.removeEventListener("loadeddata", tryPlay);
        window.clearTimeout(slowTimer);
      };
    }
    return () => window.clearTimeout(slowTimer);
  }, [autoPlay, playWithSound, seekToStart, src]);

  useEffect(() => {
    if (!isClipped) return;
    const id = window.setInterval(() => {
      const el = videoRef.current;
      if (!el || el.paused) return;
      clampToClip(el);
    }, 200);
    return () => window.clearInterval(id);
  }, [clampToClip, isClipped]);

  return (
    <div className="relative h-full w-full min-h-0">
      <video
        ref={videoRef}
        className={className}
        src={src}
        controls={isClipped ? false : controls}
        controlsList={isClipped ? "nodownload noplaybackrate" : undefined}
        playsInline
        muted={false}
        autoPlay={isClipped ? false : autoPlay}
        preload="metadata"
        onLoadedData={handleLoadedData}
        onLoadedMetadata={seekToStart}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onSeeked={handleSeeking}
        onPlay={handlePlayEvent}
        onPause={handlePauseEvent}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onError={onError}
      />

      {autoPlay && !isClipped && (buffering || needsTapPlay) && (
        <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-2 bg-black/55 pointer-events-auto">
          {buffering && !needsTapPlay ? (
            <p className="font-comic text-sm text-amber-100/90 animate-pulse">加载中…</p>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const el = videoRef.current;
                if (el) void playWithSound(el);
              }}
              className="comic-border-2 border-amber-400 bg-amber-950/90 px-4 py-2 text-sm font-bold text-amber-100 flex items-center gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden />
              点击播放
            </button>
          )}
        </div>
      )}

      {isClipped && clipDurationSec != null && showClipControls && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-2 pt-8">
          <input
            type="range"
            min={0}
            max={clipDurationSec}
            step={0.1}
            value={clipProgress}
            onChange={(e) => {
              const el = videoRef.current;
              if (!el) return;
              const progress = Number(e.target.value);
              el.currentTime = startSec + progress;
              setClipProgress(progress);
            }}
            className="mb-2 h-1.5 w-full cursor-pointer accent-amber-400"
            aria-label="片段进度"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white/30 bg-black/50 text-white"
              aria-label={playing ? "暂停" : "播放"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <span className="font-mono text-xs sm:text-sm font-bold text-white tabular-nums">
              {formatClipTime(clipProgress)} / {formatClipTime(clipDurationSec)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
