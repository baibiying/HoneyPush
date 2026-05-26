/** 构建 B 站嵌入式播放器 URL（选角预览、监督警报等） */
export function buildBilibiliPlayerUrl(
  bvid: string,
  options?: { autoplay?: boolean; startSec?: number }
): string {
  const params = new URLSearchParams({
    bvid,
    danmaku: "0",
    high_quality: "1",
  });
  if (options?.autoplay) params.set("autoplay", "1");
  if (options?.startSec != null && options.startSec > 0) {
    params.set("t", String(options.startSec));
  }
  return `https://player.bilibili.com/player.html?${params.toString()}`;
}
