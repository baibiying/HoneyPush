/** 四象限 category 与排期优先级（与产品四象限法一致） */
export const QUADRANT_CATEGORY_KEYS = [
  "import-urgent",
  "import-noturgent",
  "notimport-urgent",
  "notimport-noturgent",
] as const;

export type QuadrantCategoryKey = (typeof QUADRANT_CATEGORY_KEYS)[number];

const QUADRANT_KEY_SET = new Set<string>(QUADRANT_CATEGORY_KEYS);

/**
 * 排期执行优先级（越小越先排进日历）
 * Q1 重要且紧急 → Q4 紧急不重要 → Q2 重要不紧急 → Q3 不重要不紧急
 */
export const QUADRANT_SCHEDULE_PRIORITY: Record<QuadrantCategoryKey, number> = {
  "import-urgent": 1,
  "notimport-urgent": 2,
  "import-noturgent": 3,
  "notimport-noturgent": 4,
};

export function normalizeQuadrantCategory(category: string): QuadrantCategoryKey {
  if (QUADRANT_KEY_SET.has(category)) return category as QuadrantCategoryKey;
  return "import-noturgent";
}

export function getQuadrantSchedulePriority(category: string) {
  return QUADRANT_SCHEDULE_PRIORITY[normalizeQuadrantCategory(category)];
}

export type SchedulableTaskRef = {
  id: number;
  category: string;
  order: number;
  durationMinutes: number;
};

export function compareTasksForSchedule(
  a: SchedulableTaskRef,
  b: SchedulableTaskRef,
  deadlinesById: Map<number, Date | null>
) {
  const quadrantDiff =
    getQuadrantSchedulePriority(a.category) - getQuadrantSchedulePriority(b.category);
  if (quadrantDiff !== 0) return quadrantDiff;

  const deadlineA = deadlinesById.get(a.id)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const deadlineB = deadlinesById.get(b.id)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (deadlineA !== deadlineB) return deadlineA - deadlineB;

  if (a.order !== b.order) return a.order - b.order;
  return a.id - b.id;
}

/** 按象限 → 截止时间 → order 排序，并重写 order 字段 */
export function rankTasksForSchedule<T extends SchedulableTaskRef>(
  items: T[],
  deadlinesById: Map<number, Date | null>
): T[] {
  return [...items]
    .sort((a, b) => compareTasksForSchedule(a, b, deadlinesById))
    .map((item, index) => ({ ...item, order: index + 1 }));
}
