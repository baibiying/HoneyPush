export type CalendarTaskPalette = {
  bg: string;
  border: string;
  style?: {
    background: string;
    borderColor: string;
  };
};

/** 预设配色（两任务不会共用，按排期任务顺序依次分配） */
const CALENDAR_TASK_PALETTES: CalendarTaskPalette[] = [
  {
    bg: "bg-gradient-to-br from-[#ff8c42] via-[#ff6b1a] to-[#e85d04]",
    border: "border-[#7c2d12]",
  },
  {
    bg: "bg-gradient-to-br from-[#4ade80] via-[#22c55e] to-[#15803d]",
    border: "border-[#14532d]",
  },
  {
    bg: "bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0369a1]",
    border: "border-[#0c4a6e]",
  },
  {
    bg: "bg-gradient-to-br from-[#c084fc] via-[#a855f7] to-[#7e22ce]",
    border: "border-[#581c87]",
  },
  {
    bg: "bg-gradient-to-br from-[#f472b6] via-[#ec4899] to-[#be185d]",
    border: "border-[#9d174d]",
  },
  {
    bg: "bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#b45309]",
    border: "border-[#92400e]",
  },
  {
    bg: "bg-gradient-to-br from-[#2dd4bf] via-[#14b8a6] to-[#0f766e]",
    border: "border-[#115e59]",
  },
  {
    bg: "bg-gradient-to-br from-[#fb7185] via-[#f43f5e] to-[#be123c]",
    border: "border-[#9f1239]",
  },
  {
    bg: "bg-gradient-to-br from-[#a3e635] via-[#84cc16] to-[#4d7c0f]",
    border: "border-[#3f6212]",
  },
  {
    bg: "bg-gradient-to-br from-[#818cf8] via-[#6366f1] to-[#4338ca]",
    border: "border-[#3730a3]",
  },
  {
    bg: "bg-gradient-to-br from-[#fdba74] via-[#fb923c] to-[#c2410c]",
    border: "border-[#9a3412]",
  },
  {
    bg: "bg-gradient-to-br from-[#67e8f9] via-[#22d3ee] to-[#0891b2]",
    border: "border-[#155e75]",
  },
  {
    bg: "bg-gradient-to-br from-[#e879f9] via-[#d946ef] to-[#a21caf]",
    border: "border-[#86198f]",
  },
  {
    bg: "bg-gradient-to-br from-[#f87171] via-[#ef4444] to-[#b91c1c]",
    border: "border-[#991b1b]",
  },
  {
    bg: "bg-gradient-to-br from-[#5eead4] via-[#2dd4bf] to-[#0d9488]",
    border: "border-[#0f766e]",
  },
  {
    bg: "bg-gradient-to-br from-[#93c5fd] via-[#60a5fa] to-[#2563eb]",
    border: "border-[#1d4ed8]",
  },
];

function getGeneratedPalette(index: number): CalendarTaskPalette {
  const hue = (index * 41) % 360;
  const hue2 = (hue + 28) % 360;
  return {
    bg: "",
    border: "border-2",
    style: {
      background: `linear-gradient(to bottom right, hsl(${hue} 72% 52%), hsl(${hue2} 68% 38%))`,
      borderColor: `hsl(${hue} 45% 26%)`,
    },
  };
}

function getPaletteByIndex(index: number): CalendarTaskPalette {
  if (index < CALENDAR_TASK_PALETTES.length) {
    return CALENDAR_TASK_PALETTES[index];
  }
  return getGeneratedPalette(index);
}

/** 为每个任务 id 分配互不相同的颜色 */
export function buildCalendarTaskColorMap(taskIds: Iterable<number>): Map<number, CalendarTaskPalette> {
  const unique = [...new Set(taskIds)].sort((a, b) => a - b);
  const map = new Map<number, CalendarTaskPalette>();

  unique.forEach((taskId, index) => {
    map.set(taskId, getPaletteByIndex(index));
  });

  return map;
}

export function getCalendarTaskPalette(
  taskId: number,
  colorMap: Map<number, CalendarTaskPalette>
): CalendarTaskPalette {
  return colorMap.get(taskId) ?? getPaletteByIndex(0);
}
