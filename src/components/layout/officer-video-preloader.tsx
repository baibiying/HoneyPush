"use client";

import { useEffect } from "react";
import {
  PREFERRED_OFFICER_CHANGED_EVENT,
  readPreferredOfficer,
} from "@/lib/preferred-officer";
import {
  preloadAllOfficerPreviewVideos,
  preloadOfficerVideos,
} from "@/lib/officers/preload-officer-videos";

/** 全站：选定监督官后后台预加载其全部监督视频 */
export function OfficerVideoPreloader() {
  useEffect(() => {
    void preloadAllOfficerPreviewVideos();

    const warm = () => {
      const id = readPreferredOfficer();
      if (id) void preloadOfficerVideos(id);
    };

    warm();
    window.addEventListener(PREFERRED_OFFICER_CHANGED_EVENT, warm);
    return () => window.removeEventListener(PREFERRED_OFFICER_CHANGED_EVENT, warm);
  }, []);

  return null;
}
