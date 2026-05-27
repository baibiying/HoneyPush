"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Camera } from "lucide-react";
import { OFFICERS } from "@/lib/officers-data";
import { useI18n } from "@/i18n/i18n-provider";

interface OfficerSelectModalProps {
  taskText: string;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (officerId: string) => void;
}

export function OfficerSelectModal({
  taskText,
  isOpen,
  onClose,
  onLaunch,
}: OfficerSelectModalProps) {
  const { t } = useI18n();

  const handleSelectOfficer = (officerId: string) => {
    onLaunch(officerId);
    onClose();
  };

  const handleCloseModal = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 bg-[#FAF4D3] comic-border-2 comic-shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 p-1 hover:bg-black/10 transition-colors z-20"
            >
              <X className="w-5 h-5 text-neutral-700" />
            </button>

            <>
              <div className="bg-rose-500 px-6 py-4 border-b-4 border-[#1C1917]">
                <h2 className="font-bangers text-2xl md:text-3xl text-white tracking-wider">
                  {t("monitor.officerModal.title")}
                </h2>
                <p className="text-xs text-white/80 font-comic mt-1">
                  {t("monitor.officerModal.subtitle")}
                </p>
              </div>

              <div className="px-6 py-4 border-b-2 border-neutral-300 bg-amber-50">
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">
                  {t("monitor.currentTask")}
                </p>
                <p className="text-sm font-bold text-neutral-800 leading-relaxed">{taskText}</p>
              </div>

              <div className="px-6 py-3 bg-neutral-100 border-b-2 border-neutral-300 flex items-start gap-3">
                <Camera className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-700 leading-relaxed font-comic">
                  {t("monitor.officerModal.cameraHint")}
                </p>
              </div>

              <div className="p-6 space-y-3">
                {OFFICERS.map((officer) => (
                  <motion.button
                    key={officer.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectOfficer(officer.id)}
                    className="w-full p-4 bg-white border-2 border-[#1C1917] comic-shadow-sm hover:comic-shadow transition-all text-left group"
                    style={{ borderLeftWidth: 6, borderLeftColor: officer.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-base text-neutral-900 mb-1">{officer.name}</h3>
                        <p className="text-[11px] text-neutral-500 font-semibold mb-2">
                          {officer.title}
                        </p>
                        <p className="text-xs text-neutral-700 italic leading-relaxed bg-neutral-50 px-2 py-1 border-l-2 border-neutral-300">
                          {officer.slogan}
                        </p>
                      </div>
                      <div className="ml-4 text-xs font-bold text-neutral-400 group-hover:text-neutral-900 transition-colors">
                        {t("monitor.officerModal.start")}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
