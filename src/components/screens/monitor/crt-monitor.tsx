"use client";

import { Camera, Tv } from "lucide-react";
import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
} from "react";
import { motion } from "framer-motion";
import {
  getOfficerAlertVideoSrc,
  OFFICER_CLIP_MAX_DURATION_SEC,
  OFFICERS,
} from "@/lib/officers-data";
import { OfficerClipVideo } from "@/components/screens/schedule/officer-clip-video";
import { unlockBrowserAudio } from "@/lib/unlock-browser-audio";

export type CrtMonitorHandle = {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
};

interface CrtMonitorProps {
  isDistracted: boolean;
  mockEventText: string;
  officerId?: string;
  /** 每次摸鱼检测递增，用于重新播放监督官视频 */
  distractionPlayKey?: number;
  onDistracted?: (reason: string) => void;
  onFaceRestored?: () => void;
  /** 用户主动关闭摄像头或系统收回权限时 */
  onCameraClosedByUser?: () => void;
  /** 占满监督全屏区域 */
  fillViewport?: boolean;
}

const MISSING_FRAMES_THRESHOLD = 2;
const RESTORE_FRAMES_THRESHOLD = 4;

export const CrtMonitor = forwardRef<CrtMonitorHandle, CrtMonitorProps>(function CrtMonitor(
  {
    isDistracted,
    mockEventText,
    officerId = "yuri",
    distractionPlayKey = 0,
    onDistracted,
    onFaceRestored,
    onCameraClosedByUser,
    fillViewport = false,
  },
  ref
) {
  const [cameraActive, setCameraActive] = useState(false);
  const cameraActiveRef = useRef(false);
  const suppressCloseNotifyRef = useRef(false);
  const onCameraClosedByUserRef = useRef(onCameraClosedByUser);
  const onDistractedRef = useRef(onDistracted);
  const onFaceRestoredRef = useRef(onFaceRestored);
  onCameraClosedByUserRef.current = onCameraClosedByUser;
  onDistractedRef.current = onDistracted;
  onFaceRestoredRef.current = onFaceRestored;
  const [detectionStatus, setDetectionStatus] = useState<
    "idle" | "detecting" | "no-face" | "face-ok" | "loading"
  >("idle");
  const [faceCount, setFaceCount] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const missingFramesRef = useRef(0);
  const restoreFramesRef = useRef(0);
  const alreadyDistractedRef = useRef(false);
  const detectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceApiRef = useRef<typeof import("face-api.js") | null>(null);

  const activeOfficer = OFFICERS.find((o) => o.id === officerId) ?? OFFICERS[0];
  const alertClipStart = activeOfficer.alertVideoStartSec ?? 0;
  const alertClipDuration =
    activeOfficer.alertVideoDurationSec ?? OFFICER_CLIP_MAX_DURATION_SEC;

  const loadFaceApi = useCallback(async () => {
    if (faceApiRef.current) return true;
    try {
      setDetectionStatus("loading");
      const faceapi = await import("face-api.js");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      faceApiRef.current = faceapi;
      setModelLoaded(true);
      return true;
    } catch (e) {
      console.error("[face-api] 模型加载失败:", e);
      return false;
    }
  }, []);

  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const faceapi = faceApiRef.current;
    if (!video || !faceapi || video.readyState < 2) return;
    try {
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: isMobile ? 160 : 224,
          scoreThreshold: 0.4,
        })
      );
      const count = detections.length;
      setFaceCount(count);
      if (count === 0) {
        missingFramesRef.current += 1;
        restoreFramesRef.current = 0;
        setDetectionStatus("no-face");
        if (missingFramesRef.current >= MISSING_FRAMES_THRESHOLD && !alreadyDistractedRef.current) {
          alreadyDistractedRef.current = true;
          onDistractedRef.current?.("AI 摄像头检测到人脸消失，疑似离座或低头玩手机");
        }
      } else {
        missingFramesRef.current = 0;
        setDetectionStatus("face-ok");
        if (alreadyDistractedRef.current) {
          restoreFramesRef.current += 1;
          if (restoreFramesRef.current >= RESTORE_FRAMES_THRESHOLD) {
            alreadyDistractedRef.current = false;
            restoreFramesRef.current = 0;
            onFaceRestoredRef.current?.();
          }
        }
      }
    } catch {
      /* 静默跳过 */
    }
  }, []);

  const notifyCameraClosedByUser = useCallback(() => {
    onCameraClosedByUserRef.current?.();
  }, []);

  const stopCamera = useCallback(
    (options?: { notifyUser?: boolean }) => {
      const wasActive = cameraActiveRef.current;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
        videoRef.current.srcObject = null;
      }
      cameraActiveRef.current = false;
      setCameraActive(false);
      setDetectionStatus("idle");
      setFaceCount(0);

      const shouldNotify =
        options?.notifyUser === true &&
        wasActive &&
        !suppressCloseNotifyRef.current;
      if (shouldNotify) {
        notifyCameraClosedByUser();
      }
    },
    [notifyCameraClosedByUser]
  );

  const startCamera = useCallback(async () => {
    if (cameraActiveRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (!cameraActiveRef.current) return;
          stopCamera({ notifyUser: true });
        };
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await unlockBrowserAudio();
      cameraActiveRef.current = true;
      setCameraActive(true);
      await loadFaceApi();
    } catch (error) {
      alert(`摄像头启动失败：${error instanceof Error ? error.message : "未知错误"}`);
      cameraActiveRef.current = false;
      setCameraActive(false);
      throw error;
    }
  }, [loadFaceApi, stopCamera]);

  useImperativeHandle(
    ref,
    () => ({
      startCamera,
      stopCamera: () => {
        suppressCloseNotifyRef.current = true;
        stopCamera({ notifyUser: false });
        suppressCloseNotifyRef.current = false;
      },
    }),
    [startCamera, stopCamera]
  );

  useEffect(() => {
    if (cameraActive && modelLoaded) {
      setDetectionStatus("detecting");
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      const interval = isMobile ? 1500 : 1000;
      detectionTimerRef.current = setInterval(runDetection, interval);
    } else {
      if (detectionTimerRef.current) {
        clearInterval(detectionTimerRef.current);
        detectionTimerRef.current = null;
      }
      if (!cameraActive) {
        setDetectionStatus("idle");
        missingFramesRef.current = 0;
        alreadyDistractedRef.current = false;
      }
    }
    return () => {
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
    };
  }, [cameraActive, modelLoaded, runDetection]);

  useEffect(() => {
    return () => {
      suppressCloseNotifyRef.current = true;
      stopCamera({ notifyUser: false });
      suppressCloseNotifyRef.current = false;
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
    };
  }, [stopCamera]);

  const toggleCamera = async () => {
    if (cameraActive) stopCamera({ notifyUser: true });
    else await startCamera();
  };

  const statusLabel = () => {
    if (!cameraActive) return { text: "摄像头未激活", color: "text-stone-400" };
    switch (detectionStatus) {
      case "loading":
        return { text: "AI 模型加载中…", color: "text-yellow-300" };
      case "detecting":
        return { text: "AI 扫描中…", color: "text-yellow-400" };
      case "face-ok":
        return { text: `检测到 ${faceCount} 张人脸 ✓`, color: "text-emerald-400" };
      case "no-face":
        return { text: "⚠ 未检测到人脸", color: "text-rose-400" };
      default:
        return { text: "初始化中…", color: "text-stone-400" };
    }
  };
  const { text: statusText, color: statusColor } = statusLabel();

  return (
    <div
      className={[
        "relative overflow-hidden bg-stone-900",
        fillViewport
          ? "flex h-full min-h-0 w-full flex-col rounded-none border-0"
          : [
              "comic-border comic-shadow-lg",
              isDistracted ? "border-rose-600 comic-shadow-red" : "border-[#1C1917]",
            ].join(" "),
      ].join(" ")}
    >
      <div
        className={[
          "relative w-full bg-stone-950",
          fillViewport ? "min-h-0 flex-1" : "h-64 md:h-80",
        ].join(" ")}
      >
        <video
          ref={videoRef}
          className={[
            "absolute inset-0 w-full h-full object-cover",
            cameraActive ? "block" : "hidden",
          ].join(" ")}
          autoPlay
          playsInline
          muted
          {...({ "webkit-playsinline": "true" } as object)}
        />

        <canvas ref={canvasRef} className="hidden" />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
            <div className="text-emerald-400 flex flex-col items-center gap-2 text-center relative z-10">
              <Tv className="w-12 h-12 stroke-[1.5] animate-bounce" />
              <span className="font-mono text-xs text-stone-400">摄像头未激活</span>
              <p className="text-[11px] px-8 text-stone-500">
                开启摄像头后，AI 将本地检测专注状态；摸鱼时 {activeOfficer.name} 的视频会覆盖画面
              </p>
            </div>
          </div>
        )}

        {cameraActive && detectionStatus === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-yellow-400 font-mono text-xs text-center px-4">
              <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-2" />
              AI 模型加载中，请稍候…
            </div>
          </div>
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)",
            zIndex: 10,
          }}
        />

        <div
          className={[
            "absolute inset-0 pointer-events-none",
            isDistracted
              ? "shadow-[inset_0_0_50px_rgba(239,68,68,0.45)] bg-red-500/5"
              : "shadow-[inset_0_0_40px_rgba(16,185,129,0.12)]",
          ].join(" ")}
          style={{ zIndex: 11 }}
        />

        <div
          className={[
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28",
            "border-2 border-dashed rounded-full pointer-events-none flex items-center justify-center transition-colors duration-300",
            detectionStatus === "face-ok"
              ? "border-emerald-400/60"
              : detectionStatus === "no-face"
                ? "border-rose-500/80"
                : "border-emerald-500/20",
          ].join(" ")}
          style={{ zIndex: 12 }}
        >
          <div
            className={[
              "w-2 h-2 rounded-full transition-colors duration-300",
              detectionStatus === "face-ok"
                ? "bg-emerald-400"
                : detectionStatus === "no-face"
                  ? "bg-rose-500 animate-ping"
                  : "bg-emerald-400/30",
            ].join(" ")}
          />
        </div>

        {isDistracted && cameraActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-black"
          >
            <div className="absolute inset-0 bottom-10">
              <OfficerClipVideo
                key={`${officerId}-alert-${distractionPlayKey}`}
                className="h-full w-full object-contain bg-black"
                src={getOfficerAlertVideoSrc(activeOfficer)}
                startSec={alertClipStart}
                durationSec={alertClipDuration}
                autoPlay
                loop={false}
                controls={false}
                showClipControls={false}
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 bg-black/90 px-3 py-1.5 flex items-center justify-center gap-2">
              <span className="bg-rose-600 text-white font-bangers text-xs px-2 py-0.5 tracking-widest animate-pulse">
                {activeOfficer.name} · 抓包中！
              </span>
              <span className="text-rose-400 font-mono text-[10px] truncate max-w-[200px]">
                {mockEventText}
              </span>
            </div>
          </motion.div>
        )}

        <div
          className="absolute top-2 left-2 right-2 flex justify-between items-center text-[10px] font-mono px-2 py-1 bg-black/65 rounded pointer-events-none"
          style={{ zIndex: 30 }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={[
                "w-2 h-2 rounded-full",
                isDistracted ? "bg-rose-500 animate-ping" : "bg-emerald-400 animate-pulse",
              ].join(" ")}
            />
            <span className="text-emerald-400">AI-TRACKER: LIVE</span>
          </div>
          <span className={`text-[9px] font-bold ${statusColor}`}>{statusText}</span>
          <div className="bg-red-500 text-white font-bold px-1 rounded text-[9px] animate-pulse">
            REC
          </div>
        </div>
      </div>

      <div
        className={[
          "bg-stone-900 flex shrink-0 gap-2 items-center border-t-4 border-[#1C1917]",
          fillViewport ? "p-2 sm:p-3" : "p-3",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => void toggleCamera()}
          className="flex-1 comic-border-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold py-1.5 px-3 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Camera className={`w-3.5 h-3.5 ${cameraActive ? "text-rose-400" : "text-emerald-400"}`} />
          <span>{cameraActive ? "关闭镜头（记为失败）" : "开启实景摄像头"}</span>
        </button>
        <div className="text-[10px] text-stone-400 font-mono px-2 bg-stone-950 rounded border border-stone-800 py-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>{cameraActive && modelLoaded ? "face-api.js 运行中" : "1950s 波普滤镜挂载中"}</span>
        </div>
      </div>
    </div>
  );
});
