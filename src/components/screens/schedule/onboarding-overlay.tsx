"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import type { ScheduleScene } from "./schedule-stations";

const ONBOARDING_KEY = "honeypush-onboarding-done-v1";

type OnboardingStep = {
  titleKey: string;
  descKey: string;
  /** Which island to spotlight (percentage position relative to scrollable map) */
  spotlight?: { left: string; top: string };
  /** Scene to navigate to when user clicks "go" */
  scene?: ScheduleScene;
};

const STEPS: OnboardingStep[] = [
  {
    titleKey: "hub.onboarding.welcome",
    descKey: "hub.onboarding.welcomeDesc",
  },
  {
    titleKey: "hub.onboarding.step1",
    descKey: "hub.onboarding.step1Desc",
    spotlight: { left: "20%", top: "18%" },
    scene: "create",
  },
  {
    titleKey: "hub.onboarding.step1b",
    descKey: "hub.onboarding.step1bDesc",
    spotlight: { left: "80%", top: "16%" },
    scene: "tasks",
  },
  {
    titleKey: "hub.onboarding.step2",
    descKey: "hub.onboarding.step2Desc",
    spotlight: { left: "18%", top: "48%" },
    scene: "time",
  },
  {
    titleKey: "hub.onboarding.step3",
    descKey: "hub.onboarding.step3Desc",
    spotlight: { left: "82%", top: "46%" },
    scene: "calendar",
  },
  {
    titleKey: "hub.onboarding.step4",
    descKey: "hub.onboarding.step4Desc",
    spotlight: { left: "35%", top: "78%" },
    scene: "officer",
  },
  {
    titleKey: "hub.onboarding.ready",
    descKey: "hub.onboarding.readyDesc",
  },
];

type OnboardingOverlayProps = {
  onSceneChange: (scene: ScheduleScene) => void;
};

export function OnboardingOverlay({ onSceneChange }: OnboardingOverlayProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_KEY)) return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      /* ignore */
    }
    setFading(true);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const advance = useCallback(() => {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    setFading(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setFading(false);
    }, 200);
  }, [step, dismiss]);

  const handleGo = useCallback(
    (scene: ScheduleScene) => {
      dismiss();
      onSceneChange(scene);
    },
    [dismiss, onSceneChange],
  );

  if (!visible) return null;

  const current = STEPS[step];
  const isWelcome = step === 0;
  const isReady = step === STEPS.length - 1;
  const hasSpotlight = Boolean(current.spotlight);
  const isSpotlightTop = hasSpotlight && current.spotlight && parseInt(current.spotlight.top) < 35;

  return (
    <div
      className={[
        "absolute inset-0 z-50 transition-opacity duration-200",
        fading ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      {/* Dark backdrop with spotlight cutout */}
      <div className="absolute inset-0">
        {/* Full dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Spotlight circle that cuts through the backdrop */}
        {hasSpotlight && current.spotlight && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: current.spotlight.left,
              top: current.spotlight.top,
              transform: "translate(-50%, -50%)",
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 30px 8px rgba(251,191,36,0.35)",
              border: "3px solid rgba(251,191,36,0.6)",
            }}
          />
        )}
      </div>

      {/* Speech bubble / tooltip */}
      <div
        className="absolute"
        style={{
          left: isWelcome ? "50%" : hasSpotlight && current.spotlight ? current.spotlight.left : "50%",
          top: isWelcome 
            ? "38%" 
            : hasSpotlight && current.spotlight
              ? (parseInt(current.spotlight.top) < 35 
                  ? `calc(${current.spotlight.top} + 140px)` 
                  : `calc(${current.spotlight.top} - 180px)`)
              : "38%",
          transform: "translate(-50%, -50%)",
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        <div
          className={[
            "relative max-w-[320px] w-[85vw] sm:w-auto rounded-xl border-2 border-amber-400/60",
            "bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200",
            "px-5 py-4 shadow-[0_6px_0_#1c1917,0_8px_24px_rgba(0,0,0,0.4)]",
          ].join(" ")}
        >
          {/* Pointer triangle (when spotlight exists) */}
          {hasSpotlight && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
                isSpotlightTop ? "-top-3" : "-bottom-3"
              }`}
              style={{
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderBottom: isSpotlightTop ? "10px solid #fbbf24" : "none",
                borderTop: isSpotlightTop ? "none" : "10px solid #fbbf24",
              }}
            />
          )}

          <h3 className="font-bangers text-xl sm:text-2xl text-amber-900 tracking-wide leading-tight">
            {t(current.titleKey)}
          </h3>
          <p className="mt-1.5 font-comic text-sm sm:text-base text-amber-800/90 leading-relaxed">
            {t(current.descKey)}
          </p>

          {/* Step indicator */}
          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  "h-2 rounded-full transition-all duration-200",
                  i === step
                    ? "w-5 bg-amber-600"
                    : i < step
                      ? "w-2 bg-amber-400"
                      : "w-2 bg-amber-300/50",
                ].join(" ")}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="mt-3 flex items-center gap-2">
            {!isReady && (
              <button
                type="button"
                onClick={advance}
                className={[
                  "flex-1 rounded-lg border-2 border-[#1c1917] px-4 py-1.5",
                  "font-comic text-sm font-bold text-white",
                  "bg-gradient-to-b from-amber-400 to-amber-600",
                  "shadow-[0_3px_0_#1c1917] hover:shadow-[0_1px_0_#1c1917] hover:translate-y-[2px]",
                  "active:shadow-none active:translate-y-[3px]",
                  "transition-all duration-100",
                ].join(" ")}
              >
                {t("hub.onboarding.next")}
              </button>
            )}

            {isReady && (
              <button
                type="button"
                onClick={advance}
                className={[
                  "flex-1 rounded-lg border-2 border-[#1c1917] px-4 py-1.5",
                  "font-comic text-sm font-bold text-white",
                  "bg-gradient-to-b from-amber-400 to-amber-600",
                  "shadow-[0_3px_0_#1c1917] hover:shadow-[0_1px_0_#1c1917] hover:translate-y-[2px]",
                  "active:shadow-none active:translate-y-[3px]",
                  "transition-all duration-100",
                ].join(" ")}
              >
                {t("hub.onboarding.done")}
              </button>
            )}

            {/* "Go" button for island steps */}
            {!isWelcome && !isReady && current.scene && (
              <button
                type="button"
                onClick={() => handleGo(current.scene!)}
                className={[
                  "rounded-lg border-2 border-[#1c1917] px-4 py-1.5",
                  "font-comic text-sm font-bold text-[#1c1917]",
                  "bg-gradient-to-b from-emerald-300 to-emerald-500",
                  "shadow-[0_3px_0_#1c1917] hover:shadow-[0_1px_0_#1c1917] hover:translate-y-[2px]",
                  "active:shadow-none active:translate-y-[3px]",
                  "transition-all duration-100",
                ].join(" ")}
              >
                {t("hub.onboarding.go")}
              </button>
            )}

            {/* Skip */}
            {!isReady && (
              <button
                type="button"
                onClick={dismiss}
                className="font-comic text-xs text-amber-700/70 hover:text-amber-900 transition-colors px-1"
              >
                {t("hub.onboarding.skip")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
