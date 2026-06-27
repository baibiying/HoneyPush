#!/usr/bin/env node
/**
 * Generate ≤3 min SRT for product demo clips.
 * Run: node scripts/generate-product-demo-srt.mjs
 */

const MAX_DURATION_SEC = 180;

/** Narration time budget per clip (seconds). Sum must equal MAX_DURATION_SEC. */
const SEGMENTS = [
  {
    file: "home page.mp4",
    duration: 12,
    cues: [
      [0, 5, "HoneyPush 督蜜：AI 智能排期 + 游戏化视频监督。"],
      [5, 12, "帮你把待办变成可执行的专注计划。"],
    ],
  },
  {
    file: "register login.mp4",
    duration: 10,
    cues: [[0, 10, "注册登录后，任务与战绩同步云端。"]],
  },
  {
    file: "create task.mp4",
    duration: 10,
    cues: [[0, 10, "自然语言输入待办，AI 一键解析为结构化任务。"]],
  },
  {
    file: "show task.mp4",
    duration: 8,
    cues: [[0, 8, "在四象限任务板查看优先级与截止时间。"]],
  },
  {
    file: "availability.mp4",
    duration: 14,
    cues: [
      [0, 7, "设置本周可用时段。"],
      [7, 14, "标出你能专注的空档，排期只落在这段时间里。"],
    ],
  },
  {
    file: "AI schedule.mp4",
    duration: 16,
    cues: [
      [0, 8, "AI 根据优先级与可用时间智能排期。"],
      [8, 16, "生成 25 分钟专注 + 5 分钟休息的番茄钟日程。"],
    ],
  },
  {
    file: "choose officer.mp4",
    duration: 14,
    cues: [
      [0, 7, "选择监督官，可试看监督片段。"],
      [7, 14, "尤里教官、顾姐、林风，风格各异。"],
    ],
  },
  {
    file: "monitor failure.mp4",
    duration: 55,
    cues: [
      [0, 9, "任务前 30 分钟，每分钟弹窗提醒即将开始。"],
      [9, 18, "执行中本地视觉检测离座、玩手机、遮挡摄像头。"],
      [18, 27, "摸鱼触发监督官警示视频，每次扣一颗星。"],
      [27, 36, "三颗星扣完，专注块失败，弹出执行统计。"],
      [36, 46, "战报列出每段摸鱼次数与原因。"],
      [46, 55, "主动关摄像头，同样判定失败。"],
    ],
  },
  {
    file: "close camera failure.mp4",
    duration: 8,
    cues: [[0, 8, "关摄像头会立即终止任务，与摸鱼失败同等处理。"]],
  },
  {
    file: "monitor patrol.mp4",
    duration: 12,
    cues: [[0, 12, "到点后人脸采集，监督官巡逻盯防。"]],
  },
  {
    file: "monitor success.mp4",
    duration: 8,
    cues: [[0, 8, "专注完成则任务成功，获得专注币奖励。"]],
  },
  {
    file: "performance.mp4",
    duration: 13,
    cues: [
      [0, 7, "战绩卷轴汇总成功与失败任务。"],
      [7, 13, "专注币未来可对接 Injective 链上激励。"],
    ],
  },
];

function formatSrtTime(totalSeconds) {
  const clamped = Math.min(Math.max(0, totalSeconds), MAX_DURATION_SEC);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function buildSrt() {
  const budgetTotal = SEGMENTS.reduce((sum, s) => sum + s.duration, 0);
  if (budgetTotal !== MAX_DURATION_SEC) {
    throw new Error(`Segment budgets sum to ${budgetTotal}s, expected ${MAX_DURATION_SEC}s`);
  }

  let offset = 0;
  let index = 1;
  const lines = [];

  for (const segment of SEGMENTS) {
    for (const [start, end, text] of segment.cues) {
      const absStart = offset + start;
      const absEnd = offset + Math.min(end, segment.duration);
      if (absEnd <= absStart) continue;

      lines.push(String(index));
      lines.push(`${formatSrtTime(absStart)} --> ${formatSrtTime(absEnd)}`);
      lines.push(text);
      lines.push("");
      index += 1;
    }
    offset += segment.duration;
  }

  return { srt: lines.join("\n"), totalSeconds: offset };
}

/** Desktop clip lengths (for manifest reference only). */
const RAW_CLIP_SECONDS = {
  "home page.mp4": 11.0,
  "register login.mp4": 12.3,
  "create task.mp4": 11.1,
  "show task.mp4": 9.0,
  "availability.mp4": 19.9,
  "AI schedule.mp4": 20.9,
  "choose officer.mp4": 17.9,
  "monitor patrol.mp4": 36.1,
  "monitor failure.mp4": 142.2,
  "close camera failure.mp4": 9.7,
  "monitor success.mp4": 8.6,
  "performance.mp4": 15.4,
};

const { srt, totalSeconds } = buildSrt();
const fs = await import("node:fs");
const path = await import("node:path");

const outDir = path.join(path.join(process.cwd(), "docs/demo-video"));
const outFile = path.join(outDir, "HoneyPush_Product_Demo.srt");
const manifestFile = path.join(outDir, "HoneyPush_Product_Demo_剪辑顺序.txt");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, srt, "utf8");

const manifest = [
  "# HoneyPush 产品演示 — 剪映剪辑顺序（≤3 分钟）",
  "",
  `字幕总时长：${formatSrtTime(totalSeconds)}（${totalSeconds} 秒）`,
  "",
  "按下列顺序拼接素材，每段建议裁剪/加速到「旁白时长」列，再导入 SRT。",
  "",
  "| # | 文件 | 旁白时长 | 原片约 |",
  "|---|------|----------|--------|",
  ...SEGMENTS.map((s, i) => {
    const raw = RAW_CLIP_SECONDS[s.file];
    return `| ${i + 1} | ${s.file} | ${s.duration}s | ${raw ? `${raw.toFixed(0)}s` : "—"} |`;
  }),
  "",
  "字幕：HoneyPush_Product_Demo.srt",
  "剪映：文本 → 导入字幕（UTF-8）→ 文本朗读",
  "",
  "提示：原片合计约 5 分 14 秒，成片需剪到 3 分钟内；monitor failure.mp4 建议只保留关键片段。",
].join("\n");

fs.writeFileSync(manifestFile, manifest, "utf8");

console.log(`✅ Wrote ${outFile}`);
console.log(`✅ Wrote ${manifestFile}`);
console.log(`   Total duration: ${totalSeconds}s (${formatSrtTime(totalSeconds)})`);
