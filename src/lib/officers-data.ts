export type OfficerId = "yuri" | "gu" | "lin";

/**
 * 监督官配置（修改卡片与视频对应关系时改这里）：
 *
 * | 字段 | 作用 |
 * |------|------|
 * | title | 卡片立绘下称号、弹窗标题旁说明 |
 * | slogan | 卡片台词气泡 |
 * | alertVideoBvid / previewVideoBvid | B 站 BV，试看与摸鱼警报 |
 * | *VideoStartSec / *VideoDurationSec | 只播片段（最长 OFFICER_CLIP_MAX_DURATION_SEC） |
 *
 * 第二位、第三位建议：文案气质与 BV 内容一致（严厉督促 vs 安静陪读）。
 */
export const OFFICER_CLIP_MAX_DURATION_SEC = 20;

export interface Officer {
  id: OfficerId;
  name: string;
  title: string;
  color: string;
  bgClass: string;
  slogan: string;
  alertVideoBvid: string;
  previewVideoBvid?: string;
  previewVideoSrc?: string;
  previewVideoStartSec?: number;
  previewVideoDurationSec?: number;
  alertVideoStartSec?: number;
  alertVideoDurationSec?: number;
  quotes: {
    idle: string;
    working: string;
    warning: string;
  };
}

export const OFFICERS: Officer[] = [
  {
    id: "yuri",
    name: "尤里教官",
    title: "钢铁纪律·惩戒室主任",
    color: "#F15A24",
    bgClass: "bg-orange-500",
    slogan: "摸鱼是对时间和自己灵魂的无耻背叛，列兵！",
    alertVideoBvid: "BV1SwGz6tEkR",
    previewVideoBvid: "BV1SwGz6tEkR",
    previewVideoStartSec: 0,
    previewVideoDurationSec: OFFICER_CLIP_MAX_DURATION_SEC,
    alertVideoStartSec: 0,
    alertVideoDurationSec: OFFICER_CLIP_MAX_DURATION_SEC,
    quotes: {
      idle: "做得很优秀，列兵！继续保持高昂的专注状态！",
      working: "时间正在一秒秒蒸发！全神贯注！不可懈怠！",
      warning: "警告！列兵！你以为你在钓鱼吗？立刻放下多余的手机模块，目光回到书桌前！",
    },
  },
  {
    id: "gu",
    name: "顾姐",
    title: "苏联督学·毒舌旁白",
    color: "#D946EF",
    bgClass: "bg-fuchsia-500",
    slogan:
      "视频里那位苏联督教官正盯着你呢——你还要继续摸鱼？行啊，反正挂科的不是我。",
    /** 苏联二战军官监督（2h）· 开头为军官出镜督促 */
    alertVideoBvid: "BV1NjQLBEEyQ",
    previewVideoBvid: "BV1NjQLBEEyQ",
    previewVideoStartSec: 0,
    previewVideoDurationSec: OFFICER_CLIP_MAX_DURATION_SEC,
    alertVideoStartSec: 0,
    alertVideoDurationSec: OFFICER_CLIP_MAX_DURATION_SEC,
    quotes: {
      idle: "哼，难得看你静下来哪怕一会儿，屏幕里那位督教官总算能歇口气。",
      working: "写得这么慢？苏联督教官都比你着急，别让他看笑话。",
      warning: "抓包！督教官在视频里盯着你呢，你倒好，手机先玩上了？",
    },
  },
  {
    id: "lin",
    name: "林风师兄",
    title: "同志 LoFi·静伴自习",
    color: "#10B981",
    bgClass: "bg-emerald-500",
    slogan:
      "跟着画面里的苏联 LoFi 一起学就好，不吵不催，师兄在，累了就喝口水再接着来。",
    /** 和同志一起学习 · 1 小时苏联 LoFi 陪读 */
    alertVideoBvid: "BV1ya5D6WELy",
    previewVideoBvid: "BV1ya5D6WELy",
    previewVideoStartSec: 0,
    previewVideoDurationSec: OFFICER_CLIP_MAX_DURATION_SEC,
    alertVideoStartSec: 0,
    alertVideoDurationSec: OFFICER_CLIP_MAX_DURATION_SEC,
    quotes: {
      idle: "没关系的，深呼吸，这一步走得很扎实，你真的很棒了。",
      working: "就这样慢慢学，有 LoFi 陪着，节奏会很稳的。",
      warning: "走神啦？没关系，喝口水，我们再把这 15 分钟一起走完。",
    },
  },
];

export function getOfficerPreviewBvid(officer: Officer): string {
  return officer.previewVideoBvid ?? officer.alertVideoBvid;
}

export function getOfficerPreviewVideoSrc(officer: Officer): string {
  if (officer.previewVideoSrc) return officer.previewVideoSrc;
  const bvid = getOfficerPreviewBvid(officer);
  return `/api/officer-preview-video?bvid=${encodeURIComponent(bvid)}`;
}

export function getOfficerAlertVideoSrc(officer: Officer): string {
  return `/api/officer-preview-video?bvid=${encodeURIComponent(officer.alertVideoBvid)}`;
}
