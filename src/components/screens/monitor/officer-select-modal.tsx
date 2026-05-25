"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Rocket } from "lucide-react";
import { OFFICERS, type Officer } from "@/lib/officers-data";
import { useState } from "react";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);

  const handleSelectOfficer = (officerId: string) => {
    const officer = OFFICERS.find((o) => o.id === officerId);
    if (officer) {
      setSelectedOfficer(officer);
      setStep(2);
    }
  };

  const handleLaunch = () => {
    if (selectedOfficer) {
      onLaunch(selectedOfficer.id);
      // 重置状态
      setStep(1);
      setSelectedOfficer(null);
    }
  };

  const handleCloseModal = () => {
    setStep(1);
    setSelectedOfficer(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* 弹窗内容 */}
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 bg-[#FAF4D3] comic-border-2 comic-shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 p-1 hover:bg-black/10 transition-colors z-20"
            >
              <X className="w-5 h-5 text-neutral-700" />
            </button>

            {step === 1 ? (
              /* ── 第一步：选择监督官 ── */
              <>
                {/* 标题栏 */}
                <div className="bg-rose-500 px-6 py-4 border-b-4 border-[#1C1917]">
                  <h2 className="font-bangers text-2xl md:text-3xl text-white tracking-wider">
                    选择监督官
                  </h2>
                  <p className="text-xs text-white/80 font-comic mt-1">
                    选择一位监督官陪你完成这项任务 ↓
                  </p>
                </div>

                {/* 任务预览 */}
                <div className="px-6 py-4 border-b-2 border-neutral-300 bg-amber-50">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">
                    当前任务
                  </p>
                  <p className="text-sm font-bold text-neutral-800 leading-relaxed">
                    {taskText}
                  </p>
                </div>

                {/* Officer 选择卡片 */}
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
                          <h3 className="font-bold text-base text-neutral-900 mb-1">
                            {officer.name}
                          </h3>
                          <p className="text-[11px] text-neutral-500 font-semibold mb-2">
                            {officer.title}
                          </p>
                          <p className="text-xs text-neutral-700 italic leading-relaxed bg-neutral-50 px-2 py-1 border-l-2 border-neutral-300">
                            {officer.slogan}
                          </p>
                        </div>
                        <div className="ml-4 text-xs font-bold text-neutral-400 group-hover:text-neutral-900 transition-colors">
                          选择 →
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              /* ── 第二步：Launch 确认 ── */
              <>
                {/* 标题栏 */}
                <div className="bg-emerald-600 px-6 py-4 border-b-4 border-[#1C1917]">
                  <h2 className="font-bangers text-2xl md:text-3xl text-white tracking-wider">
                    准备就绪
                  </h2>
                  <p className="text-xs text-white/80 font-comic mt-1">
                    点击 LAUNCH 开始专注监督
                  </p>
                </div>

                {/* 配置预览 */}
                <div className="p-6 space-y-4">
                  {/* 任务卡片 */}
                  <div className="bg-amber-50 p-4 border-2 border-amber-300 comic-shadow-sm">
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">
                      📋 当前任务
                    </p>
                    <p className="text-sm font-bold text-neutral-900">{taskText}</p>
                  </div>

                  {/* 监督官卡片 */}
                  {selectedOfficer && (
                    <div
                      className="bg-white p-4 border-2 border-[#1C1917] comic-shadow"
                      style={{ borderLeftWidth: 6, borderLeftColor: selectedOfficer.color }}
                    >
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">
                        👮 监督官
                      </p>
                      <h3 className="font-bold text-lg text-neutral-900 mb-1">
                        {selectedOfficer.name}
                      </h3>
                      <p className="text-xs text-neutral-600 mb-2">{selectedOfficer.title}</p>
                      <p className="text-xs text-neutral-700 italic leading-relaxed bg-neutral-50 px-2 py-1.5 border-l-2 border-neutral-300">
                        "{selectedOfficer.slogan}"
                      </p>
                    </div>
                  )}

                  {/* 摄像头提示 */}
                  <div className="bg-neutral-100 p-4 border-2 border-neutral-300 flex items-start gap-3">
                    <Camera className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-neutral-700 leading-relaxed font-comic">
                      <p className="font-bold mb-1">点击 Launch 后将自动：</p>
                      <ul className="space-y-0.5 list-disc list-inside">
                        <li>开启摄像头实时监控</li>
                        <li>启动 AI 人脸检测系统</li>
                        <li>监督官进入待命状态</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 底部按钮区 */}
                <div className="px-6 py-4 bg-neutral-100 border-t-2 border-neutral-300 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 bg-white hover:bg-neutral-50 border-2 border-black text-neutral-700 font-bold text-sm transition-colors"
                  >
                    ← 返回重选
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLaunch}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 border-2 border-black text-white font-bangers text-xl tracking-wider comic-shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-5 h-5" />
                    <span>LAUNCH</span>
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
