"use client";

import { type Officer } from "@/lib/officers-data";
import { Volume2 } from "lucide-react";
import { OfficerAvatar } from "./officer-avatar";

interface OfficerBubbleProps {
  officer: Officer;
  isDistracted: boolean;
  timerRunning: boolean;
}

export function OfficerBubble({ officer, isDistracted, timerRunning }: OfficerBubbleProps) {
  const quote = isDistracted
    ? officer.quotes.warning
    : timerRunning
    ? officer.quotes.working
    : officer.quotes.idle;

  return (
    <div className="relative pt-4">
      <div className="bg-white p-4 comic-border rounded-xl relative comic-bubble-tail comic-shadow">
        <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-amber-500" />
            当前督导音频频道
          </span>
          <span
            className="font-black text-xs px-2 py-0.5 rounded text-white"
            style={{ backgroundColor: officer.color }}
          >
            {officer.name}
          </span>
        </div>
        <p className="text-sm font-bold text-neutral-800 leading-relaxed font-comic">{quote}</p>
      </div>

      {/* Officer mini-avatar stickout */}
      <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full border-4 border-[#1C1917] bg-stone-900 overflow-hidden comic-shadow-sm">
        <OfficerAvatar id={officer.id} />
      </div>
    </div>
  );
}
