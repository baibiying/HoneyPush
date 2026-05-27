"use client";

import { Star } from "lucide-react";

type YuriStrikeStarsProps = {
  /** 已摸鱼次数 0～3，每摸鱼一次掉一颗星 */
  strikeCount: number;
  maxStars?: number;
};

export function YuriStrikeStars({ strikeCount, maxStars = 3 }: YuriStrikeStarsProps) {
  const lost = Math.min(maxStars, Math.max(0, strikeCount));
  const remaining = maxStars - lost;

  return (
    <div
      className="flex items-center gap-1.5 rounded-xl border-2 border-[#1C1917] bg-black/75 px-3 py-1.5 sm:gap-2 sm:px-3.5 sm:py-2 comic-shadow-sm"
      role="img"
      aria-label={`监督评级：剩余 ${remaining} 颗星`}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const filled = index < remaining;
        return (
          <Star
            key={index}
            className={[
              "h-7 w-7 sm:h-9 sm:w-9 transition-all duration-500",
              "drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]",
              filled
                ? "fill-amber-400 text-amber-200 scale-100"
                : "fill-stone-800/50 text-stone-600 scale-90 opacity-45",
            ].join(" ")}
            strokeWidth={2}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

export function yuriStrikeActionLabel(strikeCount: number): string {
  if (strikeCount >= 3) return "开枪";
  if (strikeCount === 2) return "掏枪";
  if (strikeCount === 1) return "警示";
  return "专注陪伴";
}
