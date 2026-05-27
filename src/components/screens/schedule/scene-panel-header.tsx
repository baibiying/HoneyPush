"use client";

import type { ReactNode } from "react";

type ScenePanelHeaderProps = {
  icon: ReactNode;
  title: string;
};

export function ScenePanelHeader({ icon, title }: ScenePanelHeaderProps) {
  return (
    <div className="shrink-0 mb-2 sm:mb-3 pr-12">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <h2 className="font-bangers text-lg sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_0_#1C1917]">
          {title}
        </h2>
      </div>
    </div>
  );
}
