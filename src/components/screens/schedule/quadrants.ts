export const QUADRANTS = [
  {
    key: "import-urgent",
    order: 1,
    title: "第一象限",
    subtitle: "重要且紧急",
    shortTag: "Q1",
    panelBg: "bg-gradient-to-br from-[#ff8c42] via-[#ff6b1a] to-[#e85d04]",
    panelBorder: "border-[3px] border-[#7c2d12]",
    panelShadow: "shadow-[0_6px_0_rgba(124,45,18,0.9),0_0_24px_rgba(255,107,26,0.35)]",
    taskAccent: "ring-[#F57C00]/30",
    gridArea: "q1",
  },
  {
    key: "import-noturgent",
    order: 2,
    title: "第二象限",
    subtitle: "重要不紧急",
    shortTag: "Q2",
    panelBg: "bg-gradient-to-br from-[#4ade80] via-[#22c55e] to-[#15803d]",
    panelBorder: "border-[3px] border-[#14532d]",
    panelShadow: "shadow-[0_6px_0_rgba(20,83,45,0.9),0_0_24px_rgba(34,197,94,0.3)]",
    taskAccent: "ring-[#2EAF2E]/30",
    gridArea: "q2",
  },
  {
    key: "notimport-noturgent",
    order: 3,
    title: "第三象限",
    subtitle: "不紧急不重要",
    shortTag: "Q3",
    panelBg: "bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]",
    panelBorder: "border-[3px] border-[#0c4a6e]",
    panelShadow: "shadow-[0_6px_0_rgba(12,74,110,0.9),0_0_24px_rgba(14,165,233,0.3)]",
    taskAccent: "ring-[#2E9FD4]/30",
    gridArea: "q3",
  },
  {
    key: "notimport-urgent",
    order: 4,
    title: "第四象限",
    subtitle: "紧急不重要",
    shortTag: "Q4",
    panelBg: "bg-gradient-to-br from-[#a3e635] via-[#84cc16] to-[#4d7c0f]",
    panelBorder: "border-[3px] border-[#3f6212]",
    panelShadow: "shadow-[0_6px_0_rgba(63,98,18,0.9),0_0_24px_rgba(132,204,22,0.28)]",
    taskAccent: "ring-[#8BCF4A]/30",
    gridArea: "q4",
  },
] as const;

/** 2×2 网格位置：上行 [重要不紧急, 重要且紧急]，下行 [不重要不紧急, 紧急不重要] */
export const MATRIX_GRID_ORDER = [
  "import-noturgent",
  "import-urgent",
  "notimport-noturgent",
  "notimport-urgent",
] as const;

export type QuadrantKey = (typeof QUADRANTS)[number]["key"];

const QUADRANT_MAP = new Map(QUADRANTS.map((q) => [q.key, q]));

const QUADRANT_KEYS = new Set(QUADRANTS.map((q) => q.key));

export function getQuadrantMeta(key: QuadrantKey) {
  return QUADRANT_MAP.get(key)!;
}

export function normalizeQuadrantKey(category: string): QuadrantKey {
  if (QUADRANT_KEYS.has(category as QuadrantKey)) return category as QuadrantKey;
  return "import-noturgent";
}
