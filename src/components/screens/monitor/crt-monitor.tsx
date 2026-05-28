"use client";

import { Camera, ScanFace } from "lucide-react";
import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
} from "react";
import {
  getOfficerAlertClip,
  getOfficerFocusClip,
  OFFICERS,
} from "@/lib/officers-data";
import { OfficerClipVideo } from "@/components/screens/schedule/officer-clip-video";
import { YuriOfficerVideo } from "@/components/screens/monitor/yuri-officer-video";
import { SupervisionFocusTimer } from "@/components/screens/monitor/supervision-focus-timer";
import { YuriStrikeStars } from "@/components/screens/monitor/yuri-strike-stars";
import type { OfficerId } from "@/lib/officers-data";
import { preloadOfficerVideosCritical } from "@/lib/officers/preload-officer-videos";
import {
  primeUnmutedVideoPlayback,
  unlockBrowserAudio,
} from "@/lib/unlock-browser-audio";
import { OFFICER_MAIN_VIDEO_CLASS } from "@/lib/officers/officer-main-video-layout";
import {
  isYuriBehaviorDetectionClip,
  YURI_SUPERVISION_VIDEOS,
  type YuriActiveClip,
} from "@/lib/officers/yuri-supervision-videos";
import { averageDescriptors } from "@/lib/face-tracking/descriptor";
import { evaluateEnrollmentPose } from "@/lib/face-tracking/enrollment-pose";
import {
  ENROLLMENT_POSE_RESET_FRAMES,
  ENROLLMENT_TARGET_SAMPLES,
  ENROLLMENT_TIMEOUT_MS,
  ENROLLMENT_TIMEOUT_SECONDS,
  FRAMING_L1_SEC,
  FRAMING_L2_SEC,
  FRAMING_L3_LONG_SEC,
  FRAMING_L3_SEC,
  LABOR_LOST_CONFIRM_FRAMES,
  RESTORE_CONFIRM_FRAMES,
  TRIGGER_CONFIRM_FRAMES,
} from "@/lib/face-tracking/config";
import type { EnrollmentPoseIssue } from "@/lib/face-tracking/enrollment-pose";
import { isLaborPose } from "@/lib/face-tracking/enrollment-pose";
import {
  handsLikelyInWorkspace,
  measureWorkspaceSkinRatio,
} from "@/lib/face-tracking/hands-workspace-detector";
import {
  framingDistractionReason,
  pickSupervisionFace,
  resolveSupervisionFraming,
} from "@/lib/face-tracking/supervision-behavior";
import {
  evaluatePhoneUse,
  getPhoneUseLoadError,
  loadPhoneUseModels,
  phoneUseDistractionReason,
  resetPhoneUseTimers,
} from "@/lib/face-tracking/phone-use-detector";
import type {
  DistractionEvent,
  DistractionLevel,
  EnrollmentPhase,
  TrackerDetectionStatus,
} from "@/lib/face-tracking/types";
import { useI18n } from "@/i18n/i18n-provider";
import {
  translateDistractionOrHint,
  translatePoseHint,
} from "@/lib/monitor-i18n";
import {
  loadFaceApiRuntime,
  resetFaceApiCache,
  type FaceApiLoadStage,
} from "@/lib/face-tracking/load-face-api";

export type CrtMonitorHandle = {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  isCameraActive: () => boolean;
  /** 新一段专注开始前重新人脸采集（超时未完成则本段失败） */
  restartEnrollmentForBlock: () => void;
};

interface CrtMonitorProps {
  isDistracted: boolean;
  distractionLevel: DistractionLevel;
  mockEventText: string;
  officerId?: string;
  distractionPlayKey?: number;
  /** 恢复劳动后递增，强制重播专注片段 */
  focusPlayKey?: number;
  onDistracted?: (event: DistractionEvent) => void;
  onFaceRestored?: () => void;
  onCameraClosedByUser?: () => void;
  /** 采集超时未完成 */
  onEnrollmentTimeout?: () => void;
  /** 采集完成，可开始本段专注计时 */
  onEnrollmentReady?: () => void;
  /** 采集失败（如模型加载失败） */
  onEnrollmentFailed?: (reason: string) => void;
  /** 尤里教官：累计第三次摸鱼「开枪」片段结束 */
  onYuriThirdStrikeComplete?: () => void;
  /** 尤里教官：当前摸鱼次数（1～3） */
  yuriStrikeCount?: number;
  /** 尤里：摸鱼警示播完进入 idle 检测（清除摸鱼 UI，保留扣星） */
  onYuriIdleRecoveryStart?: () => void;
  /** 段间休息时暂停摸鱼检测 */
  behaviorDetectionPaused?: boolean;
  /** 本段已失败/结束时不再提示「请开启摄像头」 */
  hideCameraOffHint?: boolean;
  fillViewport?: boolean;
  /** 本段专注倒计时（剩余 / 已专注） */
  focusTimer?: {
    totalSeconds: number;
    remainingSeconds: number;
    blockLabel?: string;
  };
}

type FaceApiModule = typeof import("face-api.js");
type WithDescriptor = {
  detection: { box: { x: number; y: number; width: number; height: number } };
  descriptor: Float32Array;
  landmarks: {
    getNose: () => { x: number; y: number }[];
    getLeftEye: () => { x: number; y: number }[];
    getRightEye: () => { x: number; y: number }[];
    getJawOutline: () => { x: number; y: number }[];
  };
};

export const CrtMonitor = forwardRef<CrtMonitorHandle, CrtMonitorProps>(function CrtMonitor(
  {
    isDistracted,
    distractionLevel,
    mockEventText,
    officerId = "yuri",
    distractionPlayKey = 0,
    focusPlayKey = 0,
    onDistracted,
    onFaceRestored,
    onCameraClosedByUser,
    onEnrollmentTimeout,
    onEnrollmentReady,
    onEnrollmentFailed,
    onYuriThirdStrikeComplete,
    yuriStrikeCount = 0,
    onYuriIdleRecoveryStart,
    behaviorDetectionPaused = false,
    hideCameraOffHint = false,
    fillViewport = false,
    focusTimer,
  },
  ref
) {
  const { t } = useI18n();
  const isYuriOfficer = officerId === "yuri";
  const [cameraActive, setCameraActive] = useState(false);
  const [enrollmentPhase, setEnrollmentPhase] = useState<EnrollmentPhase>("pending");
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [enrollmentHint, setEnrollmentHint] = useState(() =>
    t("monitor.enrollment.cameraPlacement")
  );
  const [enrollmentPoseOk, setEnrollmentPoseOk] = useState(false);
  const [enrollmentTimeLeftSec, setEnrollmentTimeLeftSec] = useState(
    ENROLLMENT_TIMEOUT_SECONDS
  );
  const [useLegacyFaceCount, setUseLegacyFaceCount] = useState(false);
  const [phoneModelsLoading, setPhoneModelsLoading] = useState(false);
  const [phoneDetectorReady, setPhoneDetectorReady] = useState(false);
  const [phoneLoadError, setPhoneLoadError] = useState<string | null>(null);
  const [phoneBestScore, setPhoneBestScore] = useState(0);
  const phoneUseActiveRef = useRef(false);
  const lastPhoneReasonRef = useRef("");
  const cameraActiveRef = useRef(false);
  const suppressCloseNotifyRef = useRef(false);
  const onCameraClosedByUserRef = useRef(onCameraClosedByUser);
  const onDistractedRef = useRef(onDistracted);
  const onFaceRestoredRef = useRef(onFaceRestored);
  const onEnrollmentTimeoutRef = useRef(onEnrollmentTimeout);
  const onEnrollmentReadyRef = useRef(onEnrollmentReady);
  const onEnrollmentFailedRef = useRef(onEnrollmentFailed);
  const enrollmentDeadlineRef = useRef<number | null>(null);
  const enrollmentTimeoutFiredRef = useRef(false);
  onCameraClosedByUserRef.current = onCameraClosedByUser;
  onDistractedRef.current = onDistracted;
  onFaceRestoredRef.current = onFaceRestored;
  onEnrollmentTimeoutRef.current = onEnrollmentTimeout;
  onEnrollmentReadyRef.current = onEnrollmentReady;
  onEnrollmentFailedRef.current = onEnrollmentFailed;

  const [detectionStatus, setDetectionStatus] = useState<TrackerDetectionStatus>("idle");
  const [modelLoadStage, setModelLoadStage] = useState<FaceApiLoadStage | null>(null);
  const [modelLoadSlow, setModelLoadSlow] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [userFaceMatched, setUserFaceMatched] = useState(false);
  const [yuriSupervisionEnabled, setYuriSupervisionEnabled] = useState(false);
  const yuriSupervisionEnabledRef = useRef(false);
  const [yuriIdleDetectionActive, setYuriIdleDetectionActive] = useState(false);
  const yuriIdleDetectionActiveRef = useRef(false);
  const [yuriDistractionBannerVisible, setYuriDistractionBannerVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceApiRef = useRef<FaceApiModule | null>(null);
  const recognitionReadyRef = useRef(false);
  const userDescriptorRef = useRef<Float32Array | null>(null);
  const enrollmentSamplesRef = useRef<Float32Array[]>([]);
  const enrollmentBadFramesRef = useRef(0);
  /** 采集阶段脸下方工作区肤色基线，用于监督时判断双手是否仍在画面 */
  const handsSkinBaselineRef = useRef<number | null>(null);

  const framingBadSinceRef = useRef<number | null>(null);
  const phoneSinceRef = useRef<number | null>(null);
  const lastFramingIssueRef = useRef<EnrollmentPoseIssue>("no-face");
  const triggerFramesRef = useRef(0);
  const restoreFramesRef = useRef(0);
  const laborLostStreakRef = useRef(0);
  const alreadyDistractedRef = useRef(false);
  const episodeLevelRef = useRef<DistractionLevel | 0>(0);
  const detectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeOfficer = OFFICERS.find((o) => o.id === officerId) ?? OFFICERS[0];
  const focusClip = getOfficerFocusClip(activeOfficer);
  const alertClip = getOfficerAlertClip(activeOfficer, distractionLevel);
  const mainClip = isDistracted ? alertClip : focusClip;
  const mainClipKey = isDistracted
    ? `${officerId}-alert-L${distractionLevel}-${distractionPlayKey}`
    : `${officerId}-focus-${focusPlayKey}`;

  const resetTrackingState = useCallback(() => {
    userDescriptorRef.current = null;
    enrollmentSamplesRef.current = [];
    framingBadSinceRef.current = null;
    phoneSinceRef.current = null;
    lastFramingIssueRef.current = "no-face";
    triggerFramesRef.current = 0;
    restoreFramesRef.current = 0;
    laborLostStreakRef.current = 0;
    alreadyDistractedRef.current = false;
    episodeLevelRef.current = 0;
    setEnrollmentProgress(0);
    setEnrollmentPhase("pending");
    setEnrollmentHint(t("monitor.enrollment.cameraPlacement"));
    setEnrollmentPoseOk(false);
    enrollmentBadFramesRef.current = 0;
    handsSkinBaselineRef.current = null;
    enrollmentDeadlineRef.current = null;
    enrollmentTimeoutFiredRef.current = false;
    setEnrollmentTimeLeftSec(ENROLLMENT_TIMEOUT_SECONDS);
    setUserFaceMatched(false);
    setYuriSupervisionEnabled(false);
    yuriSupervisionEnabledRef.current = false;
    yuriIdleDetectionActiveRef.current = false;
    setYuriIdleDetectionActive(false);
    setYuriDistractionBannerVisible(false);
    resetPhoneUseTimers();
    phoneUseActiveRef.current = false;
    setPhoneBestScore(0);
    setPhoneDetectorReady(false);
    setPhoneLoadError(null);
    lastPhoneReasonRef.current = "";
  }, []);

  const fireEnrollmentTimeout = useCallback(() => {
    if (enrollmentTimeoutFiredRef.current) return;
    enrollmentTimeoutFiredRef.current = true;
    onEnrollmentTimeoutRef.current?.();
  }, []);

  const notifyEnrollmentReady = useCallback(() => {
    onEnrollmentReadyRef.current?.();
  }, []);

  const beginEnrollmentForBlock = useCallback(() => {
    if (!recognitionReadyRef.current) {
      setEnrollmentPhase("ready");
      setDetectionStatus("detecting");
      notifyEnrollmentReady();
      return;
    }

    userDescriptorRef.current = null;
    enrollmentSamplesRef.current = [];
    enrollmentBadFramesRef.current = 0;
    handsSkinBaselineRef.current = null;
    enrollmentDeadlineRef.current = Date.now() + ENROLLMENT_TIMEOUT_MS;
    enrollmentTimeoutFiredRef.current = false;
    setEnrollmentTimeLeftSec(ENROLLMENT_TIMEOUT_SECONDS);
    setEnrollmentProgress(0);
    setEnrollmentPoseOk(false);
    setEnrollmentPhase("enrolling");
    setDetectionStatus("enrolling");
    setEnrollmentHint(t("monitor.enrollment.cameraPlacement"));
    setUserFaceMatched(false);

    if (isYuriOfficer) {
      yuriSupervisionEnabledRef.current = false;
      setYuriSupervisionEnabled(false);
      yuriIdleDetectionActiveRef.current = false;
      setYuriIdleDetectionActive(false);
      setYuriDistractionBannerVisible(false);
    }
  }, [isYuriOfficer, notifyEnrollmentReady]);

  const applyFaceModelReady = useCallback(() => {
    if (recognitionReadyRef.current) {
      enrollmentDeadlineRef.current = Date.now() + ENROLLMENT_TIMEOUT_MS;
      enrollmentTimeoutFiredRef.current = false;
      setEnrollmentTimeLeftSec(ENROLLMENT_TIMEOUT_SECONDS);
      setEnrollmentPhase("enrolling");
      setDetectionStatus("enrolling");
    } else {
      setEnrollmentPhase("ready");
      setDetectionStatus("detecting");
      notifyEnrollmentReady();
    }
  }, [notifyEnrollmentReady]);

  const loadFaceApi = useCallback(async () => {
    if (faceApiRef.current) return true;
    const slowTimer = window.setTimeout(() => setModelLoadSlow(true), 12_000);
    try {
      setDetectionStatus("loading");
      setModelLoadSlow(false);
      setModelLoadStage("import");
      const { faceapi, recognitionReady } = await loadFaceApiRuntime((stage) => {
        setModelLoadStage(stage);
      });
      faceApiRef.current = faceapi;
      recognitionReadyRef.current = recognitionReady;
      setUseLegacyFaceCount(!recognitionReady);
      setModelLoaded(true);
      setDetectionStatus(recognitionReady ? "enrolling" : "detecting");
      return true;
    } catch (e) {
      console.error("[face-api] 模型加载失败:", e);
      faceApiRef.current = null;
      recognitionReadyRef.current = false;
      setModelLoaded(false);
      setEnrollmentPhase("failed");
      setDetectionStatus("idle");
      onEnrollmentFailedRef.current?.(t("monitor.crt.modelLoadFail"));
      return false;
    } finally {
      window.clearTimeout(slowTimer);
      setModelLoadStage(null);
      setModelLoadSlow(false);
    }
  }, [t]);

  const retryFaceModelLoad = useCallback(async () => {
    resetFaceApiCache();
    faceApiRef.current = null;
    recognitionReadyRef.current = false;
    setModelLoaded(false);
    setEnrollmentPhase("pending");
    const ok = await loadFaceApi();
    if (ok) applyFaceModelReady();
  }, [applyFaceModelReady, loadFaceApi]);

  const tryAddEnrollmentSample = useCallback((descriptor: Float32Array) => {
    enrollmentSamplesRef.current.push(descriptor);
    const n = enrollmentSamplesRef.current.length;
    setEnrollmentProgress(Math.min(100, Math.round((n / ENROLLMENT_TARGET_SAMPLES) * 100)));
    if (n >= ENROLLMENT_TARGET_SAMPLES) {
      userDescriptorRef.current = averageDescriptors(enrollmentSamplesRef.current);
      setEnrollmentPhase("ready");
      setDetectionStatus("detecting");
      setEnrollmentHint(
        isYuriOfficer
          ? t("monitor.enrollment.successIntro")
          : t("monitor.enrollment.successStarted")
      );
      setEnrollmentPoseOk(true);
      notifyEnrollmentReady();
    }
  }, [isYuriOfficer, notifyEnrollmentReady, t]);

  const computeTargetLevel = useCallback((): DistractionLevel | 0 => {
    const now = Date.now();
    let framingSec = 0;
    if (framingBadSinceRef.current != null) {
      framingSec = (now - framingBadSinceRef.current) / 1000;
    }
    if (framingSec >= FRAMING_L3_LONG_SEC || framingSec >= FRAMING_L3_SEC) return 3;
    if (framingSec >= FRAMING_L2_SEC) return 2;
    if (phoneSinceRef.current != null) return 2;
    if (framingSec >= FRAMING_L1_SEC) return 1;
    return 0;
  }, []);

  const distractionReasonForLevel = useCallback(
    (level: DistractionLevel, phoneActive: boolean): string => {
      if (phoneActive && level >= 2) {
        return lastPhoneReasonRef.current || "检测到玩手机，请放下手机回到任务";
      }
      return framingDistractionReason(lastFramingIssueRef.current);
    },
    []
  );

  const fireDistraction = useCallback(
    (level: DistractionLevel, reason: string) => {
      if (isYuriOfficer) {
        if (alreadyDistractedRef.current) return;
        alreadyDistractedRef.current = true;
        episodeLevelRef.current = 1;
        onDistractedRef.current?.({
          level: 1,
          reason,
          loopUntilRestore: false,
        });
        return;
      }
      if (alreadyDistractedRef.current && level <= (episodeLevelRef.current || 0)) {
        return;
      }
      alreadyDistractedRef.current = true;
      episodeLevelRef.current = level;
      onDistractedRef.current?.({
        level,
        reason,
        loopUntilRestore: level === 3,
      });
    },
    [isYuriOfficer]
  );

  const resolveHandsInWorkspace = useCallback(
    (
      video: HTMLVideoElement,
      faceBox: { x: number; y: number; width: number; height: number } | null
    ) => {
      if (!faceBox) return false;
      const skinRatio = measureWorkspaceSkinRatio(video, faceBox);
      return handsLikelyInWorkspace(skinRatio, handsSkinBaselineRef.current);
    },
    []
  );

  const processSupervisionFrame = useCallback(
    (
      framing: ReturnType<typeof evaluateEnrollmentPose>,
      phoneUseActive: boolean,
      userMatched: boolean,
      handsInWorkspace: boolean
    ) => {
      const labor = isLaborPose(framing, userMatched, handsInWorkspace);

      if (labor) {
        laborLostStreakRef.current = 0;
        framingBadSinceRef.current = null;
        setUserFaceMatched(true);
        if (phoneUseActive) {
          if (phoneSinceRef.current == null) phoneSinceRef.current = Date.now();
          setDetectionStatus("phone");
          restoreFramesRef.current = 0;
        } else {
          phoneSinceRef.current = null;
          setDetectionStatus("face-ok");
          if (alreadyDistractedRef.current) {
            restoreFramesRef.current += 1;
            if (restoreFramesRef.current >= RESTORE_CONFIRM_FRAMES) {
              alreadyDistractedRef.current = false;
              episodeLevelRef.current = 0;
              restoreFramesRef.current = 0;
              triggerFramesRef.current = 0;
              onFaceRestoredRef.current?.();
            }
          } else {
            restoreFramesRef.current = 0;
          }
        }
      } else {
        laborLostStreakRef.current += 1;
        if (laborLostStreakRef.current >= LABOR_LOST_CONFIRM_FRAMES) {
          if (framingBadSinceRef.current == null) {
            framingBadSinceRef.current = Date.now();
          }
          if (!userMatched) {
            lastFramingIssueRef.current = "no-face";
          } else if (!framing.ok) {
            lastFramingIssueRef.current = framing.issue;
          } else if (!handsInWorkspace) {
            lastFramingIssueRef.current = "hands-missing";
          } else {
            lastFramingIssueRef.current = framing.issue;
          }
          setUserFaceMatched(userMatched && framing.ok);
          if (phoneUseActive) {
            if (phoneSinceRef.current == null) phoneSinceRef.current = Date.now();
            setDetectionStatus("phone");
          } else {
            phoneSinceRef.current = null;
            setDetectionStatus("framing-bad");
          }
          restoreFramesRef.current = 0;
        } else {
          triggerFramesRef.current = 0;
        }
      }

      const targetLevel = computeTargetLevel();
      if (targetLevel > 0) {
        triggerFramesRef.current += 1;
        if (triggerFramesRef.current >= TRIGGER_CONFIRM_FRAMES) {
          const phoneActive = phoneSinceRef.current != null;
          fireDistraction(
            targetLevel as DistractionLevel,
            distractionReasonForLevel(targetLevel as DistractionLevel, phoneActive)
          );
        }
      } else {
        triggerFramesRef.current = 0;
      }
    },
    [computeTargetLevel, distractionReasonForLevel, fireDistraction]
  );

  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const faceapi = faceApiRef.current;
    if (!video || !faceapi || video.readyState < 2) return;

    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const detectorOpts = new faceapi.TinyFaceDetectorOptions({
      inputSize: isMobile ? 160 : 224,
      scoreThreshold: 0.4,
    });

    try {
      if (useLegacyFaceCount || !recognitionReadyRef.current) {
        const results = await faceapi
          .detectAllFaces(video, detectorOpts)
          .withFaceLandmarks();
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const sole = results.length === 1 ? results[0] : null;
        const framing = resolveSupervisionFraming(sole?.detection.box ?? null, vw, vh);
        const hands = sole
          ? resolveHandsInWorkspace(video, sole.detection.box)
          : false;
        processSupervisionFrame(
          framing,
          phoneUseActiveRef.current,
          sole != null,
          hands
        );
        return;
      } else if (enrollmentPhase === "enrolling" || enrollmentPhase === "pending") {
        setDetectionStatus("enrolling");
        const results = await faceapi
          .detectAllFaces(video, detectorOpts)
          .withFaceLandmarks()
          .withFaceDescriptors();

        const pose = evaluateEnrollmentPose(
          results.map((r) => r.detection.box),
          video.videoWidth,
          video.videoHeight
        );
        setEnrollmentHint(translatePoseHint(pose.issue, pose.hint, t));
        setEnrollmentPoseOk(pose.ok);

        if (!pose.ok) {
          enrollmentBadFramesRef.current += 1;
          if (
            enrollmentSamplesRef.current.length > 0 &&
            enrollmentBadFramesRef.current >= ENROLLMENT_POSE_RESET_FRAMES
          ) {
            enrollmentSamplesRef.current = [];
            enrollmentBadFramesRef.current = 0;
            handsSkinBaselineRef.current = null;
            setEnrollmentProgress(0);
            setEnrollmentHint(
              `${translatePoseHint(pose.issue, pose.hint, t)}${t("monitor.pose.poseChangedSuffix")}`
            );
          }
          return;
        }

        enrollmentBadFramesRef.current = 0;
        if (results.length === 1) {
          const box = results[0].detection.box;
          const skinRatio = measureWorkspaceSkinRatio(video, box);
          handsSkinBaselineRef.current = Math.max(
            handsSkinBaselineRef.current ?? 0,
            skinRatio
          );
          tryAddEnrollmentSample((results[0] as WithDescriptor).descriptor);
        }
        return;
      } else if (
        enrollmentPhase === "ready" &&
        userDescriptorRef.current &&
        (!isYuriOfficer ||
          (yuriSupervisionEnabledRef.current &&
            yuriIdleDetectionActiveRef.current &&
            !behaviorDetectionPaused))
      ) {
        const results = await faceapi
          .detectAllFaces(video, detectorOpts)
          .withFaceLandmarks()
          .withFaceDescriptors();

        const userDesc = userDescriptorRef.current;
        const picked = pickSupervisionFace(
          results as WithDescriptor[],
          userDesc
        );

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const framing = resolveSupervisionFraming(
          picked.face?.detection.box ?? null,
          vw,
          vh
        );
        const hands = picked.face
          ? resolveHandsInWorkspace(video, picked.face.detection.box)
          : false;
        processSupervisionFrame(
          framing,
          phoneUseActiveRef.current,
          picked.userMatched,
          hands
        );
      }
    } catch {
      /* 静默跳过 */
    }
  }, [
    enrollmentPhase,
    isYuriOfficer,
    processSupervisionFrame,
    resolveHandsInWorkspace,
    tryAddEnrollmentSample,
    useLegacyFaceCount,
    behaviorDetectionPaused,
  ]);

  const handleYuriIntroComplete = useCallback(() => {
    yuriSupervisionEnabledRef.current = true;
    setYuriSupervisionEnabled(true);
    setEnrollmentHint(t("monitor.enrollment.introDone"));
  }, []);

  const handleYuriActiveClipChange = useCallback((clip: YuriActiveClip) => {
    const active = isYuriBehaviorDetectionClip(clip);
    yuriIdleDetectionActiveRef.current = active;
    setYuriIdleDetectionActive(active);
    if (!active) {
      phoneUseActiveRef.current = false;
      resetPhoneUseTimers();
    }
  }, []);

  /** 警示片结束：仅重置检测计时，不结束摸鱼回合（alreadyDistracted 须等恢复劳动后才清除） */
  const handleYuriEnterIdleRecovery = useCallback(() => {
    episodeLevelRef.current = 0;
    triggerFramesRef.current = 0;
    restoreFramesRef.current = 0;
    laborLostStreakRef.current = 0;
    framingBadSinceRef.current = null;
    phoneSinceRef.current = null;
    resetPhoneUseTimers();
    onYuriIdleRecoveryStart?.();
  }, [onYuriIdleRecoveryStart]);

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
      resetTrackingState();

      const shouldNotify =
        options?.notifyUser === true && wasActive && !suppressCloseNotifyRef.current;
      if (shouldNotify) notifyCameraClosedByUser();
    },
    [notifyCameraClosedByUser, resetTrackingState]
  );

  const startCamera = useCallback(async () => {
    if (cameraActiveRef.current) return;
    const oid = officerId as OfficerId;
    if (oid === "yuri" || oid === "gu" || oid === "lin") {
      void preloadOfficerVideosCritical(oid);
    }
    if (isYuriOfficer) {
      primeUnmutedVideoPlayback(YURI_SUPERVISION_VIDEOS.intro);
    }
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
      const ok = await loadFaceApi();
      if (ok) applyFaceModelReady();
    } catch (error) {
      alert(
        t("monitor.crt.cameraFailAlert", {
          message: error instanceof Error ? error.message : t("monitor.crt.cameraFailUnknown"),
        })
      );
      cameraActiveRef.current = false;
      setCameraActive(false);
      throw error;
    }
  }, [applyFaceModelReady, isYuriOfficer, loadFaceApi, stopCamera]);

  useImperativeHandle(
    ref,
    () => ({
      startCamera,
      stopCamera: () => {
        suppressCloseNotifyRef.current = true;
        stopCamera({ notifyUser: false });
        suppressCloseNotifyRef.current = false;
      },
      isCameraActive: () => cameraActiveRef.current,
      restartEnrollmentForBlock: beginEnrollmentForBlock,
    }),
    [beginEnrollmentForBlock, startCamera, stopCamera]
  );

  useEffect(() => {
    if (enrollmentPhase !== "enrolling" || !enrollmentDeadlineRef.current) {
      return;
    }
    const tick = () => {
      const leftMs = Math.max(0, enrollmentDeadlineRef.current! - Date.now());
      setEnrollmentTimeLeftSec(Math.ceil(leftMs / 1000));
      if (leftMs <= 0) fireEnrollmentTimeout();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enrollmentPhase, fireEnrollmentTimeout]);

  useEffect(() => {
    if (cameraActive && modelLoaded && enrollmentPhase === "ready") {
      setDetectionStatus("detecting");
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      const interval = isMobile ? 900 : 700;
      detectionTimerRef.current = setInterval(runDetection, interval);
    } else if (
      cameraActive &&
      modelLoaded &&
      (enrollmentPhase === "enrolling" || enrollmentPhase === "pending")
    ) {
      const interval = 800;
      detectionTimerRef.current = setInterval(runDetection, interval);
    } else if (cameraActive && modelLoaded && useLegacyFaceCount) {
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      detectionTimerRef.current = setInterval(runDetection, isMobile ? 900 : 700);
    } else {
      if (detectionTimerRef.current) {
        clearInterval(detectionTimerRef.current);
        detectionTimerRef.current = null;
      }
    }
    return () => {
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
    };
  }, [cameraActive, enrollmentPhase, modelLoaded, runDetection, useLegacyFaceCount]);

  useEffect(() => {
    if (!cameraActive || !modelLoaded) return;
    setPhoneModelsLoading(true);
    void loadPhoneUseModels()
      .then((ok) => {
        setPhoneDetectorReady(ok);
        setPhoneLoadError(ok ? null : getPhoneUseLoadError());
      })
      .finally(() => setPhoneModelsLoading(false));
  }, [cameraActive, modelLoaded]);

  useEffect(() => {
    const supervisionActive =
      (enrollmentPhase === "ready" || useLegacyFaceCount) &&
      !behaviorDetectionPaused &&
      (!isYuriOfficer || (yuriSupervisionEnabled && yuriIdleDetectionActive));
    if (!cameraActive || !modelLoaded || !supervisionActive || !phoneDetectorReady) {
      phoneUseActiveRef.current = false;
      return;
    }

    let cancelled = false;
    const tick = async () => {
      const video = videoRef.current;
      if (cancelled || !video || video.readyState < 2) return;
      try {
        const sig = await evaluatePhoneUse(video);
        if (cancelled) return;
        phoneUseActiveRef.current = sig.active;
        setPhoneBestScore(sig.bestPhoneScore);
        if (sig.active) {
          lastPhoneReasonRef.current = phoneUseDistractionReason();
        }
      } catch {
        /* 跳过本帧 */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 450);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      phoneUseActiveRef.current = false;
      setPhoneBestScore(0);
    };
  }, [
    cameraActive,
    enrollmentPhase,
    isYuriOfficer,
    modelLoaded,
    phoneDetectorReady,
    useLegacyFaceCount,
    yuriSupervisionEnabled,
    yuriIdleDetectionActive,
    behaviorDetectionPaused,
  ]);

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

  const showDistractionBanner =
    isDistracted && (!isYuriOfficer || yuriDistractionBannerVisible);

  const statusLabel = () => {
    if (!cameraActive) return { text: t("monitor.crt.statusInactive"), color: "text-stone-400" };
    if (useLegacyFaceCount) {
      return { text: t("monitor.crt.statusLegacy"), color: "text-amber-300" };
    }
    switch (detectionStatus) {
      case "loading":
        return { text: t("monitor.crt.statusLoading"), color: "text-yellow-300" };
      case "enrolling":
        return {
          text: t("monitor.crt.statusEnrolling", { progress: enrollmentProgress }),
          color: "text-cyan-300",
        };
      case "detecting":
      case "face-ok":
        if (phoneModelsLoading) {
          return { text: t("monitor.crt.statusPhoneLoading"), color: "text-yellow-300" };
        }
        if (!phoneDetectorReady) {
          return {
            text: phoneLoadError
              ? t("monitor.crt.statusPhoneNotReady")
              : t("monitor.crt.statusPhoneFailed"),
            color: "text-rose-400",
          };
        }
        return {
          text: userFaceMatched ? t("monitor.crt.statusMatched") : t("monitor.crt.statusScanning"),
          color: "text-emerald-400",
        };
      case "framing-bad":
        return { text: t("monitor.crt.statusFramingLost"), color: "text-rose-400" };
      case "phone":
        return { text: t("monitor.crt.statusPhoneVisible"), color: "text-amber-400" };
      default:
        return { text: t("monitor.crt.statusInit"), color: "text-stone-400" };
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
              showDistractionBanner ? "border-rose-600 comic-shadow-red" : "border-[#1C1917]",
            ].join(" "),
      ].join(" ")}
    >
      <div
        className={[
          "relative w-full bg-black",
          fillViewport ? "min-h-0 flex-1" : "h-64 md:h-80",
        ].join(" ")}
      >
        <canvas ref={canvasRef} className="hidden" />

        {/* 主画面：监督官视频（专注 / 摸鱼警告） */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-black">
          {isYuriOfficer ? (
            <YuriOfficerVideo
              className={OFFICER_MAIN_VIDEO_CLASS}
              enrollmentReady={enrollmentPhase === "ready" || useLegacyFaceCount}
              isDistracted={isDistracted}
              strikeCount={yuriStrikeCount}
              onIntroComplete={handleYuriIntroComplete}
              onThirdStrikeComplete={() => onYuriThirdStrikeComplete?.()}
              onActiveClipChange={handleYuriActiveClipChange}
              onDistractionBannerChange={setYuriDistractionBannerVisible}
              onAlertPhaseEnd={handleYuriEnterIdleRecovery}
            />
          ) : (
            <OfficerClipVideo
              key={mainClipKey}
              className={OFFICER_MAIN_VIDEO_CLASS}
              src={mainClip.src}
              startSec={mainClip.startSec}
              durationSec={mainClip.durationSec}
              autoPlay
              loop={!isDistracted || distractionLevel === 3}
              controls={false}
              showClipControls={false}
            />
          )}
        </div>

        <div
          className={[
            "absolute inset-0 pointer-events-none z-[1]",
            showDistractionBanner
              ? "shadow-[inset_0_0_80px_rgba(239,68,68,0.35)]"
              : "shadow-[inset_0_0_60px_rgba(16,185,129,0.08)]",
          ].join(" ")}
        />

        {showDistractionBanner && (
          <div
            className={[
              "absolute z-[20] pointer-events-none",
              "left-2 right-[38%] sm:left-3 sm:right-[42%]",
              "bottom-12 sm:bottom-14",
            ].join(" ")}
            role="alert"
            aria-live="assertive"
          >
            <div className="w-full max-w-lg comic-border-2 border-rose-500 bg-rose-950/92 px-3 py-3 sm:px-4 sm:py-4 text-left shadow-[0_6px_0_#1c1917] backdrop-blur-[2px]">
              <p className="font-bangers text-xl sm:text-2xl tracking-wide text-rose-300 animate-pulse">
                {t("monitor.crt.slackingAlert")}
                {isYuriOfficer && yuriStrikeCount > 0 && (
                  <span className="ml-2 text-base sm:text-lg font-mono text-rose-200/90">
                    {t("monitor.crt.strikeCount", { current: yuriStrikeCount })}
                  </span>
                )}
              </p>
              <p className="mt-1.5 sm:mt-2 text-sm sm:text-base font-bold leading-snug text-white line-clamp-3">
                {translateDistractionOrHint(mockEventText, t)}
              </p>
              <p className="mt-1.5 text-xs sm:text-sm font-mono text-rose-200/85">
                {isYuriOfficer
                  ? yuriStrikeCount >= 3
                    ? t("monitor.crt.thirdStrikeFail")
                    : t("monitor.crt.correctToContinue")
                  : t("monitor.crt.officerUrging", { name: activeOfficer.name })}
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-8 pb-2 pointer-events-none">
          <div className="flex items-end justify-between gap-2">
            <span
              className={[
                "font-bangers text-sm sm:text-base tracking-wide px-2 py-0.5",
                showDistractionBanner
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-emerald-700/90 text-emerald-100",
              ].join(" ")}
            >
              {activeOfficer.name} ·{" "}
              {isYuriOfficer
                ? !yuriSupervisionEnabled
                  ? t("monitor.crt.intro")
                  : showDistractionBanner || isDistracted
                    ? t("monitor.crt.slackingAlert")
                    : t("monitor.crt.focusCompanion")
                : showDistractionBanner || isDistracted
                  ? t("monitor.crt.slackingAlert")
                  : t("monitor.crt.focusCompanion")}
            </span>
            {!showDistractionBanner && !isDistracted && yuriSupervisionEnabled && (
              <span className="text-emerald-400/90 font-mono text-[10px] hidden sm:inline">
                {t("monitor.crt.normalSupervision")}
              </span>
            )}
          </div>
        </div>

        {/* 右下角实景画中画 */}
        <div
          className={[
            "absolute z-30 overflow-hidden comic-border-2 bg-stone-950 shadow-[0_4px_0_#1C1917]",
            "right-2 bottom-2 sm:right-3 sm:bottom-3",
            "w-[34%] min-w-[120px] max-w-[240px] aspect-[4/3]",
            showDistractionBanner ? "border-rose-500" : "border-emerald-600",
          ].join(" ")}
        >
          <video
            ref={videoRef}
            className={[
              "absolute inset-0 h-full w-full object-cover",
              cameraActive ? "block" : "hidden",
            ].join(" ")}
            autoPlay
            playsInline
            muted
            {...({ "webkit-playsinline": "true" } as object)}
          />
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900 p-2 text-center">
              <Camera className="w-6 h-6 text-stone-600 mb-1" />
              <span className="text-[9px] text-stone-500 font-mono leading-tight">
                {t("monitor.crt.liveFeed")}
              </span>
            </div>
          )}
          {cameraActive && (
            <div className="absolute top-1 left-1 right-1 flex justify-between items-center pointer-events-none">
              <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded animate-pulse">
                REC
              </span>
              <span
                className={[
                  "text-[8px] font-bold px-1 rounded max-w-[70%] truncate",
                  showDistractionBanner ? "bg-rose-600 text-white" : "bg-black/70 text-emerald-400",
                ].join(" ")}
              >
                {statusText}
              </span>
            </div>
          )}
          {cameraActive &&
            (enrollmentPhase === "ready" || useLegacyFaceCount) &&
            phoneDetectorReady && (
              <p className="absolute bottom-0.5 left-0 right-0 text-center text-[7px] font-mono text-stone-400 pointer-events-none">
                {t("monitor.crt.phoneScore", { score: (phoneBestScore * 100).toFixed(0) })}
              </p>
            )}
          {cameraActive &&
            !phoneModelsLoading &&
            !phoneDetectorReady &&
            (enrollmentPhase === "ready" || useLegacyFaceCount) && (
              <p className="absolute bottom-0.5 left-0 right-0 text-center text-[7px] font-mono text-rose-400/90 pointer-events-none px-1">
                {t("monitor.crt.phoneModelMissing")}
              </p>
            )}
        </div>

        {!cameraActive && !hideCameraOffHint && (
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center p-4 pointer-events-none bg-black/40">
            <p className="text-sm px-6 text-stone-300 text-center leading-relaxed max-w-md drop-shadow">
              {t("monitor.crt.cameraOffHint")}
            </p>
          </div>
        )}

        {cameraActive && !useLegacyFaceCount && detectionStatus === "loading" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-4 sm:px-8">
            <div className="w-full max-w-md comic-border-2 border-cyan-400 bg-stone-950/95 px-5 py-6 sm:px-8 sm:py-8 text-center shadow-[0_6px_0_#22d3ee]">
              <ScanFace className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 text-cyan-300 animate-pulse" />
              <p className="font-bangers text-2xl sm:text-3xl tracking-wide text-cyan-200">
                {t("monitor.crt.cameraOnTitle")}
              </p>
              <p className="mt-3 text-base sm:text-lg font-bold leading-relaxed text-amber-50">
                {t("monitor.crt.cameraPlacementBefore")}
                <span className="text-cyan-300">{t("monitor.crt.cameraPlacementHighlight")}</span>
                {t("monitor.crt.cameraPlacementAfter")}
              </p>
              <p className="mt-2 text-sm sm:text-base text-stone-300 leading-relaxed">
                {t("monitor.crt.cameraPlacementWhy")}
              </p>
              <p className="mt-3 text-sm font-mono text-cyan-200/90">
                {modelLoadStage
                  ? t(`monitor.crt.modelLoadStage_${modelLoadStage}`)
                  : t("monitor.crt.statusLoading")}
              </p>
              {modelLoadSlow && (
                <p className="mt-2 text-xs text-amber-200/90 leading-relaxed">
                  {t("monitor.crt.modelLoadSlowHint")}
                </p>
              )}
              <div className="mt-5 flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-cyan-400 border-t-transparent" />
                {modelLoadSlow && (
                  <button
                    type="button"
                    onClick={() => void retryFaceModelLoad()}
                    className="comic-border-2 border-cyan-400 bg-cyan-950/80 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-900/80 cursor-pointer"
                  >
                    {t("monitor.crt.modelLoadRetry")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {cameraActive && !useLegacyFaceCount && enrollmentPhase === "enrolling" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 px-4 sm:px-8">
            <div className="w-full max-w-lg comic-border-2 border-amber-400 bg-stone-950/95 px-5 py-6 sm:px-8 sm:py-8 text-center shadow-[0_6px_0_#fbbf24]">
              <ScanFace className="mx-auto mb-3 h-14 w-14 sm:h-16 sm:w-16 text-amber-300" />
              <p className="font-bangers text-3xl sm:text-4xl tracking-wide text-amber-200">
                {t("monitor.crt.faceEnrollment")}
              </p>
              <p className="mt-4 text-lg sm:text-xl font-bold text-white leading-relaxed">
                {t("monitor.crt.cameraPlacementBefore")}
                <span className="text-cyan-300">{t("monitor.crt.cameraPlacementHighlight")}</span>
                {t("monitor.crt.cameraPlacementAfter")}
              </p>
              <p className="mt-3 text-base sm:text-lg text-amber-100/95 leading-relaxed">
                {t("monitor.crt.cameraPlacementWhyShort")}
              </p>
              <div
                className={[
                  "mt-4 rounded-lg border-2 px-3 py-2.5 sm:px-4 sm:py-3",
                  enrollmentPoseOk
                    ? "border-emerald-500/80 bg-emerald-950/50"
                    : "border-amber-500/90 bg-amber-950/40 animate-pulse",
                ].join(" ")}
              >
                <p
                  className={[
                    "text-base sm:text-lg font-bold leading-snug",
                    enrollmentPoseOk ? "text-emerald-300" : "text-amber-200",
                  ].join(" ")}
                >
                  {enrollmentHint}
                </p>
              </div>
              <div className="mt-5 w-full h-3 sm:h-3.5 bg-stone-800 rounded overflow-hidden border-2 border-stone-600">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${enrollmentProgress}%` }}
                />
              </div>
              <p className="mt-3 font-mono text-lg sm:text-xl font-bold tabular-nums text-cyan-300">
                {enrollmentPoseOk
                  ? t("monitor.crt.collectingProgress", { progress: enrollmentProgress })
                  : t("monitor.crt.waitingPose")}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-stone-400">
                {t("monitor.crt.enrollmentDeadlinePrefix")}
                <span className="text-rose-400 font-bold tabular-nums">
                  {Math.floor(enrollmentTimeLeftSec / 60)}:
                  {(enrollmentTimeLeftSec % 60).toString().padStart(2, "0")}
                </span>
                {t("monitor.crt.enrollmentDeadline")}
              </p>
            </div>
          </div>
        )}

        <div
          className="absolute inset-0 pointer-events-none z-[2] opacity-30"
          style={{
            background:
              "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)",
          }}
        />

        {isYuriOfficer && yuriSupervisionEnabled && (
          <div className="absolute top-2 right-2 z-[36] pointer-events-none">
            <YuriStrikeStars strikeCount={yuriStrikeCount} />
          </div>
        )}

        {focusTimer && focusTimer.totalSeconds > 0 && (
          <div className="absolute top-12 left-2 z-[36] pointer-events-none sm:top-14 md:top-16">
            <SupervisionFocusTimer
              totalSeconds={focusTimer.totalSeconds}
              remainingSeconds={focusTimer.remainingSeconds}
              blockLabel={focusTimer.blockLabel}
            />
          </div>
        )}

        <div
          className={[
            "absolute top-2 left-2 flex justify-between items-center text-[10px] font-mono px-2 py-1 bg-black/65 rounded pointer-events-none z-[35]",
            focusTimer && focusTimer.totalSeconds > 0
              ? "right-[44%] sm:right-[300px] md:right-[340px]"
              : "right-[38%] sm:right-[260px]",
          ].join(" ")}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={[
                "w-2 h-2 rounded-full",
                showDistractionBanner ? "bg-rose-500 animate-ping" : "bg-emerald-400 animate-pulse",
              ].join(" ")}
            />
            <span className="text-emerald-400">AI-TRACKER</span>
          </div>
          {cameraActive && (
            <span className={`text-[9px] font-bold ${statusColor} truncate max-w-[40%]`}>
              {statusText}
            </span>
          )}
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
          <span>
            {cameraActive ? t("monitor.crt.closeCameraFail") : t("monitor.crt.openCamera")}
          </span>
        </button>
        <div className="text-[10px] text-stone-400 font-mono px-2 bg-stone-950 rounded border border-stone-800 py-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>
            {cameraActive && modelLoaded
              ? enrollmentPhase === "ready"
                ? t("monitor.crt.trackerReady")
                : t("monitor.crt.trackerFaceApi")
              : t("monitor.crt.trackerFilter")}
          </span>
        </div>
      </div>
    </div>
  );
});
