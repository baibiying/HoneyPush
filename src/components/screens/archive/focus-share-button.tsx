"use client";

import { memory, share } from "@eazo/sdk";
import { motion } from "framer-motion";

interface FocusShareButtonProps {
  totalSessions: number;
  consecutiveDays: number;
  totalCoins: number;
  userName?: string;
}

export function FocusShareButton({
  totalSessions,
  consecutiveDays,
  totalCoins,
  userName = "学员",
}: FocusShareButtonProps) {
  const handleShare = async () => {
    try {
      const text = [
        "Achievement share card request",
        "Share scenario: focus_bureau_milestone",
        "App: 专注局 Focus Bureau",
        `Player: ${userName}`,
        `Headline: 专注局档案成就`,
        `Primary metric: 完成 ${totalSessions} 轮番茄专注`,
        `Supporting stat: 连续坚持 ${consecutiveDays} 天`,
        `Supporting stat: 累计获得 ${totalCoins} 专注币`,
        "App context: 1950s 复古漫画风格 AI 监督效率工具，有三位风格迥异的AI监督官陪伴专注",
      ].join("\n");

      memory.reportAction({
        content: `用户分享专注局成就：${totalSessions}轮完成，${consecutiveDays}天连续，${totalCoins}专注币`,
        event_type: "memory.reportAction",
        page: "archive",
        metadata: {
          type: "focus_milestone_shared",
          action_kind: "domain_event",
          app_id: process.env.NEXT_PUBLIC_EAZO_APP_ID,
          action_type: "focus_milestone_shared",
          subject_id: `milestone_${totalSessions}`,
          count_delta: 1,
          totalSessions,
          consecutiveDays,
          totalCoins,
        },
      }).catch(() => {});

      await share.compose({
        text,
        sourceAppId: process.env.NEXT_PUBLIC_EAZO_APP_ID || undefined,
        targetPath: "/archive",
      });
    } catch {
      // share failure is silent
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      whileTap={{ scale: 0.94 }}
      className="bg-yellow-400 hover:bg-yellow-300 text-neutral-900 text-xs font-bold py-1.5 px-3 border-2 border-black comic-shadow-sm comic-btn-push flex items-center gap-1.5"
    >
      <span>分享专注成就</span>
    </motion.button>
  );
}
