/** 尤里教官（第一位监督官）本地监督视频 */
export const YURI_SUPERVISION_VIDEOS = {
  intro: "/officers/yuri/intro.mp4",
  idle: "/officers/yuri/idle.mp4",
  patrolLeft: "/officers/yuri/patrol-left.mp4",
  patrolRight: "/officers/yuri/patrol-right.mp4",
  warn: "/officers/yuri/warn.mp4",
  drawGun: "/officers/yuri/draw-gun.mp4",
  shoot: "/officers/yuri/shoot.mp4",
} as const;

/** 未摸鱼时循环：无人 → 左巡视 → 无人 → 右巡视 */
export const YURI_PATROL_CYCLE = [
  YURI_SUPERVISION_VIDEOS.idle,
  YURI_SUPERVISION_VIDEOS.patrolLeft,
  YURI_SUPERVISION_VIDEOS.idle,
  YURI_SUPERVISION_VIDEOS.patrolRight,
] as const;

export function yuriAlertVideoForStrike(strike: number): string | null {
  if (strike === 1) return YURI_SUPERVISION_VIDEOS.warn;
  if (strike === 2) return YURI_SUPERVISION_VIDEOS.drawGun;
  if (strike >= 3) return YURI_SUPERVISION_VIDEOS.shoot;
  return null;
}
