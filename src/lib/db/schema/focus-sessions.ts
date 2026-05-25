import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export type ScheduledFocusSegmentRecord = {
  startAt: string;
  endAt: string;
};

// 专注记录表
export const focusSessions = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  officerId: varchar("officer_id", { length: 32 }).notNull().default("yuri"),
  taskId: integer("task_id"),
  outcome: varchar("outcome", { length: 32 }).notNull().default("completed"),
  durationMinutes: integer("duration_minutes").notNull().default(25),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  coinsEarned: integer("coins_earned").notNull().default(15),
  distractionCount: integer("distraction_count").notNull().default(0),
});

export type FocusSession = InferSelectModel<typeof focusSessions>;

// 任务表
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  text: text("text").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(25),
  category: varchar("category", { length: 64 }).notNull().default("import-urgent"),
  checked: boolean("checked").notNull().default(false),
  deadline: timestamp("deadline"),
  scheduledStartAt: timestamp("scheduled_start_at"),
  scheduledEndAt: timestamp("scheduled_end_at"),
  /** AI 排期产生的各段专注起止（ISO），用于日历避免番茄钟休息段误显示重叠 */
  scheduledFocusSegments: jsonb("scheduled_focus_segments").$type<
    ScheduledFocusSegmentRecord[] | null
  >(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Task = InferSelectModel<typeof tasks>;

// 用户专注统计表
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  totalCoins: integer("total_coins").notNull().default(0),
  consecutiveDays: integer("consecutive_days").notNull().default(0),
  totalSessions: integer("total_sessions").notNull().default(0),
  lastSessionDate: timestamp("last_session_date"),
  unlockedBadges: text("unlocked_badges").array().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserStats = InferSelectModel<typeof userStats>;
