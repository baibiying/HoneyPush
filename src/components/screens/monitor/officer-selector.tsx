"use client";

import { type Officer } from "@/lib/officers-data";
import { motion } from "framer-motion";
import { OfficerAvatar } from "./officer-avatar";

interface OfficerSelectorProps {
  officers: Officer[];
  currentId: string;
  onSelect: (id: string) => void;
}

export function OfficerSelector({ officers, currentId, onSelect }: OfficerSelectorProps) {
  return (
    <div className="bg-amber-100 p-5 comic-border comic-shadow">
      <div className="flex justify-between items-center pb-2 mb-4 border-b-4 border-[#1C1917]">
        <h3 className="font-bangers text-2xl font-black text-[#1C1917]">CHOOSE OFFICER</h3>
        <span className="bg-red-500 text-white px-1.5 text-xs font-bold border-2 border-black">
          3 候选
        </span>
      </div>

      <p className="text-xs font-semibold text-neutral-600 mb-4 font-comic">
        触发行为阈值时，不同AI人格监考官会使用完全不同的监督语录
      </p>

      <div className="space-y-4">
        {officers.map((officer) => {
          const isSelected = officer.id === currentId;
          return (
            <motion.div
              key={officer.id}
              onClick={() => onSelect(officer.id)}
              whileTap={{ scale: 0.97 }}
              className={[
                "cursor-pointer p-3 border-4 transition-all",
                isSelected
                  ? "bg-white ring-4 ring-neutral-900 border-[#1C1917] comic-shadow"
                  : "bg-[#FEFCE8]/80 hover:bg-[#FEFCE8] border-neutral-700 opacity-75 hover:opacity-100",
              ].join(" ")}
            >
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-none border-2 border-black overflow-hidden flex-shrink-0 bg-stone-900">
                  <OfficerAvatar id={officer.id} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-[#1C1917] truncate">{officer.name}</h4>
                    {isSelected && (
                      <span className="bg-amber-400 text-neutral-900 text-[10px] px-1.5 font-black border border-black animate-bounce">
                        督导中
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 font-bold leading-tight line-clamp-1">
                    {officer.title}
                  </p>
                  <p className="text-[10px] text-neutral-700 italic leading-snug line-clamp-1 mt-1 bg-neutral-100 px-1 py-0.5 border border-dashed border-gray-400 rounded">
                    {officer.slogan}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
