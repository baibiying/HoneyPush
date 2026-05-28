"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Play, X } from "lucide-react";
import type { Officer } from "@/lib/officers-data";
import { getOfficerPreviewVideoSrc } from "@/lib/officers-data";
import { preloadOfficerPreviewVideo } from "@/lib/officers/preload-officer-videos";
import { OfficerClipVideo } from "./officer-clip-video";
import { useI18n } from "@/i18n/i18n-provider";

type OfficerVideoPreviewProps = {
  officer: Officer;
};

export function OfficerVideoPreview({ officer }: OfficerVideoPreviewProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const startSec = officer.previewVideoStartSec ?? 0;
  const durationSec = officer.previewVideoDurationSec;
  const videoSrc = getOfficerPreviewVideoSrc(officer);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    void preloadOfficerPreviewVideo(officer.id);
  }, [officer.id, videoSrc]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLoadError(false);
      return;
    }
    setLoadError(false);
  }, [open, videoSrc]);

  const stopCardClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  };

  const modal =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label={t("officer.previewCloseOverlay")}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`officer-preview-title-${officer.id}`}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative z-10 flex h-[min(92dvh,920px)] w-[min(96vw,1120px)] max-h-[92dvh] flex-col overflow-hidden rounded-xl border-[3px] border-[#1c1917] bg-[#faf4d3] shadow-[0_8px_0_#1c1917]"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="h-1.5 border-b-2 border-[#1c1917]"
                style={{ background: `linear-gradient(90deg, ${officer.color}, ${officer.color}88)` }}
              />

              <div className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-[#1c1917] bg-amber-100/80 px-4 py-3 sm:px-5 sm:py-3.5">
                <div className="min-w-0">
                  <p
                    id={`officer-preview-title-${officer.id}`}
                    className="font-bangers text-2xl sm:text-3xl text-[#1c1917] leading-tight"
                  >
                    {officer.name}
                  </p>
                  <p className="mt-0.5 text-sm sm:text-base font-bold text-neutral-700">{officer.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-[#1c1917] bg-white shadow-[0_2px_0_#1c1917] hover:bg-amber-50"
                  aria-label={t("officer.previewClose")}
                >
                  <X className="h-5 w-5 text-[#1c1917]" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4 md:p-5">
                <div className="relative min-h-0 flex-1 overflow-hidden border-[3px] border-[#1c1917] bg-black shadow-[0_4px_0_#1c1917]">
                  {loadError ? (
                    <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-bold text-amber-100">
                      {t("officer.previewLoadFailed")}
                    </p>
                  ) : (
                    <OfficerClipVideo
                      key={`${officer.id}-${videoSrc}-${startSec}-${durationSec ?? "full"}`}
                      className="h-full w-full object-contain bg-black"
                      src={videoSrc}
                      startSec={startSec}
                      durationSec={durationSec}
                      loop={false}
                      autoPlay
                      controls={durationSec == null}
                      onError={() => setLoadError(true)}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
      <div className="w-full" onClick={stopCardClick} onKeyDown={stopCardClick} role="presentation">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className={[
            "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#1c1917] py-2 sm:py-2.5",
            "text-sm sm:text-base font-black text-white shadow-[0_3px_0_#1c1917] transition-transform active:translate-y-0.5 active:shadow-none",
          ].join(" ")}
          style={{ backgroundColor: officer.color }}
        >
          <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" aria-hidden />
          {t("officer.previewClip")}
        </button>
      </div>
      {modal}
    </>
  );
}
