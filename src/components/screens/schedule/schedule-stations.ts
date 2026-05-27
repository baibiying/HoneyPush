import { CalendarDays, Clock, LayoutGrid, Plus, Shield } from "lucide-react";
export type ScheduleScene =
  | "map"
  | "create"
  | "tasks"
  | "time"
  | "calendar"
  | "officer"
  | "performance";

export type StationConfig = {
  id: ScheduleScene;
  /** create = 直接打开创建任务表单 */
  action: "create" | "enter";
  title: string;
  subtitle: string;
  icon: typeof Plus;
  gradient: string;
  glow: string;
  /** 岛屿沙滩环、装饰物 */
  shore: string;
  decor: string;
  /** SVG 不规则岛轮廓（viewBox 0 0 100 92） */
  islandPath: string;
  islandFillTop: string;
  islandFillBottom: string;
  /** 沙滩与海岸色 */
  islandSand: string;
  islandSandDeep: string;
  shoreStroke: string;
  /** 岛屿光晕色（用于脉冲与阴影） */
  accentGlow: string;
};

export const STATIONS: StationConfig[] = [
  {
    id: "tasks",
    action: "create",
    title: "创建任务",
    subtitle: "录入名称、用时与截止时间",
    icon: Plus,
    gradient: "from-emerald-400 via-emerald-500 to-teal-700",
    glow: "shadow-[0_0_32px_rgba(16,185,129,0.55)]",
    shore: "from-amber-100 to-amber-300",
    decor: "🌴",
    islandPath:
      "M 11 51 C 1 34, 5 12, 30 5 C 54 1, 86 11, 92 35 C 97 58, 79 85, 49 89 C 30 91, 7 72, 11 51 Z",
    islandFillTop: "#4ade80",
    islandFillBottom: "#14532d",
    islandSand: "#fde68a",
    islandSandDeep: "#d97706",
    shoreStroke: "#fef3c7",
    accentGlow: "rgba(74,222,128,0.55)",
  },
  {
    id: "tasks",
    action: "enter",
    title: "查看任务",
    subtitle: "浏览已创建任务 · 四象限分布",
    icon: LayoutGrid,
    gradient: "from-sky-400 via-sky-500 to-indigo-700",
    glow: "shadow-[0_0_32px_rgba(56,189,248,0.55)]",
    shore: "from-sky-100 to-cyan-200",
    decor: "🧭",
    islandPath:
      "M 13 17 C 34 5, 62 6, 78 16 L 92 20 C 99 30, 98 46, 94 58 L 99 74 C 90 90, 60 90, 38 84 C 16 74, 3 52, 7 32 C 9 22, 11 19, 13 17 Z",
    islandFillTop: "#7dd3fc",
    islandFillBottom: "#1e3a8a",
    islandSand: "#fef08a",
    islandSandDeep: "#ca8a04",
    shoreStroke: "#ecfeff",
    accentGlow: "rgba(56,189,248,0.55)",
  },
  {
    id: "time",
    action: "enter",
    title: "可用时段",
    subtitle: "设置每天能做任务的时段",
    icon: Clock,
    gradient: "from-amber-300 via-orange-400 to-orange-600",
    glow: "shadow-[0_0_32px_rgba(251,191,36,0.55)]",
    shore: "from-orange-100 to-amber-200",
    decor: "⏳",
    islandPath:
      "M 5 40 C 11 13, 44 3, 68 13 C 92 25, 96 56, 81 79 C 61 94, 28 92, 11 75 C 2 58, 3.5 49, 5 40 Z",
    islandFillTop: "#fcd34d",
    islandFillBottom: "#9a3412",
    islandSand: "#fff7ed",
    islandSandDeep: "#ea580c",
    shoreStroke: "#ffedd5",
    accentGlow: "rgba(251,191,36,0.55)",
  },
  {
    id: "calendar",
    action: "enter",
    title: "AI 排期",
    subtitle: "番茄钟 25+5 · 查看日历并排期",
    icon: CalendarDays,
    gradient: "from-fuchsia-400 via-purple-500 to-violet-800",
    glow: "shadow-[0_0_32px_rgba(192,132,252,0.55)]",
    shore: "from-violet-100 to-fuchsia-200",
    decor: "✨",
    islandPath:
      "M 24 15 C 47 4, 77 9, 88 33 C 95 57, 84 82, 53 87 C 28 85, 9 64, 11 40 C 14 26, 19 20, 24 15 Z",
    islandFillTop: "#f0abfc",
    islandFillBottom: "#4c1d95",
    islandSand: "#fce7f3",
    islandSandDeep: "#c026d3",
    shoreStroke: "#fdf4ff",
    accentGlow: "rgba(192,132,252,0.55)",
  },
  {
    id: "officer",
    action: "enter",
    title: "选择监督官",
    subtitle: "选定默认监督官 · 到点自动开摄像头",
    icon: Shield,
    gradient: "from-orange-400 via-red-500 to-red-800",
    glow: "shadow-[0_0_32px_rgba(239,68,68,0.55)]",
    shore: "from-orange-100 to-red-200",
    decor: "👮",
    islandPath:
      "M 8 38 C 4 18, 28 4, 52 6 C 78 8, 94 28, 92 52 C 90 76, 68 90, 42 88 C 18 86, 7 50, 8 38 Z",
    islandFillTop: "#fb923c",
    islandFillBottom: "#7f1d1d",
    islandSand: "#fed7aa",
    islandSandDeep: "#c2410c",
    shoreStroke: "#fff7ed",
    accentGlow: "rgba(239,68,68,0.55)",
  },
];
