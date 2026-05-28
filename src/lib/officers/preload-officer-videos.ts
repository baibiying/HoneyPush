import type { OfficerId } from "@/lib/officers-data";
import {
  preloadVideoAsset,
  preloadVideoAssetsParallel,
} from "@/lib/media-playback";
import {
  getAllOfficerPreviewVideoUrls,
  getOfficerPreviewVideoUrl,
  getOfficerSupervisionVideoPriority,
} from "@/lib/officers/officer-video-sources";

const inflight = new Map<OfficerId, Promise<void>>();
let allPreviewInflight: Promise<void> | null = null;

/** 预加载该监督官全部监督视频（intro / 劳动 / 摸鱼警示等） */
export function preloadOfficerVideos(officerId: OfficerId): Promise<void> {
  const existing = inflight.get(officerId);
  if (existing) return existing;

  const job = (async () => {
    const { critical, rest } = getOfficerSupervisionVideoPriority(officerId);
    await preloadVideoAssetsParallel(critical, { concurrency: 2 });
    if (rest.length > 0) {
      await preloadVideoAssetsParallel(rest, { concurrency: 2 });
    }
  })();

  inflight.set(officerId, job);
  void job.finally(() => {
    if (inflight.get(officerId) === job) inflight.delete(officerId);
  });

  return job;
}

/** 仅缓冲即将开播的关键片段（选监督官 / 开摄像头时） */
export function preloadOfficerVideosCritical(officerId: OfficerId): Promise<void> {
  const { critical } = getOfficerSupervisionVideoPriority(officerId);
  return preloadVideoAssetsParallel(critical, { concurrency: 2 });
}

/** 预加载单个监督官的「试看监督片段」 */
export function preloadOfficerPreviewVideo(officerId: OfficerId): Promise<void> {
  const url = getOfficerPreviewVideoUrl(officerId);
  if (!url) return Promise.resolve();
  return preloadVideoAsset(url);
}

/** 预加载全部监督官试看片段（进入选角页时） */
export function preloadAllOfficerPreviewVideos(): Promise<void> {
  if (allPreviewInflight) return allPreviewInflight;

  const urls = getAllOfficerPreviewVideoUrls();
  allPreviewInflight = preloadVideoAssetsParallel(urls, { concurrency: 2 }).finally(
    () => {
      allPreviewInflight = null;
    }
  );

  return allPreviewInflight;
}

/** 进入排期页时：先缓冲全部试看，再缓冲已选监督官的完整监督包 */
export function preloadOfficerPanelVideos(preferredOfficerId?: OfficerId | null) {
  void preloadAllOfficerPreviewVideos();
  if (preferredOfficerId) {
    void preloadOfficerVideos(preferredOfficerId);
  }
}

export { isVideoPreloaded } from "@/lib/media-playback";
