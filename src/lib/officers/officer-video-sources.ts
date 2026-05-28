import {
  getOfficerAlertClip,
  getOfficerFocusClip,
  getOfficerPreviewVideoSrc,
  OFFICERS,
  type Officer,
  type OfficerAlertLevel,
  type OfficerId,
} from "@/lib/officers-data";
import {
  YURI_PATROL_CYCLE,
  YURI_SUPERVISION_VIDEOS,
} from "@/lib/officers/yuri-supervision-videos";

const ALERT_LEVELS: OfficerAlertLevel[] = [1, 2, 3, 4];

function uniqueUrls(urls: Array<string | null | undefined>) {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}

/** 「试看监督片段」按钮使用的视频 URL */
export function getOfficerPreviewVideoUrl(officerId: OfficerId): string | null {
  const officer = OFFICERS.find((o) => o.id === officerId);
  if (!officer) return null;
  return getOfficerPreviewVideoSrc(officer);
}

/** 全部监督官试看片段 URL（排期页选角用） */
export function getAllOfficerPreviewVideoUrls(): string[] {
  return uniqueUrls(OFFICERS.map((o) => getOfficerPreviewVideoSrc(o)));
}

/** 该监督官监督流程会用到的全部视频 URL（含试看片段，去重） */
export function getOfficerSupervisionVideoUrls(officerId: OfficerId): string[] {
  const officer = OFFICERS.find((o) => o.id === officerId);
  if (!officer) return [];

  const preview = getOfficerPreviewVideoUrl(officerId);

  if (officerId === "yuri") {
    return uniqueUrls([
      preview,
      YURI_SUPERVISION_VIDEOS.intro,
      YURI_SUPERVISION_VIDEOS.idle,
      ...YURI_PATROL_CYCLE,
      YURI_SUPERVISION_VIDEOS.warn,
      YURI_SUPERVISION_VIDEOS.drawGun,
      YURI_SUPERVISION_VIDEOS.shoot,
    ]);
  }

  return uniqueUrls([preview, ...collectBilibiliOfficerUrls(officer)]);
}

function collectBilibiliOfficerUrls(officer: Officer) {
  const urls: string[] = [getOfficerFocusClip(officer).src];
  for (const level of ALERT_LEVELS) {
    urls.push(getOfficerAlertClip(officer, level).src);
  }
  return urls;
}

/** 任务开始前优先缓冲：开场 / 劳动陪伴 / 第一次摸鱼警示 */
export function getOfficerSupervisionVideoPriority(officerId: OfficerId): {
  critical: string[];
  rest: string[];
} {
  const all = getOfficerSupervisionVideoUrls(officerId);
  const preview = getOfficerPreviewVideoUrl(officerId);

  if (officerId === "yuri") {
    const critical = uniqueUrls([
      preview,
      YURI_SUPERVISION_VIDEOS.intro,
      YURI_SUPERVISION_VIDEOS.idle,
      YURI_SUPERVISION_VIDEOS.warn,
    ]);
    return {
      critical,
      rest: all.filter((url) => !critical.includes(url)),
    };
  }

  const officer = OFFICERS.find((o) => o.id === officerId);
  if (!officer) return { critical: [], rest: [] };

  const focusSrc = getOfficerFocusClip(officer).src;
  const alertL2 = getOfficerAlertClip(officer, 2).src;
  const critical = uniqueUrls([preview, focusSrc, alertL2]);
  return {
    critical,
    rest: all.filter((url) => !critical.includes(url)),
  };
}
