"use client";

import { useEffect } from "react";

/** 排期页全屏时去掉 main 的上下 padding，避免底部露出漫画黄底 */
export function ScheduleMainReset() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const previous = {
      paddingTop: main.style.paddingTop,
      paddingBottom: main.style.paddingBottom,
      minHeight: main.style.minHeight,
    };

    main.style.paddingTop = "0";
    main.style.paddingBottom = "0";
    main.style.minHeight = "0";

    return () => {
      main.style.paddingTop = previous.paddingTop;
      main.style.paddingBottom = previous.paddingBottom;
      main.style.minHeight = previous.minHeight;
    };
  }, []);

  return null;
}
