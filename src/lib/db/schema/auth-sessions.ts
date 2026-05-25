import type { InferSelectModel } from "drizzle-orm";
import { index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    sessionTokenHash: text("session_token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
    expiresAtIdx: index("auth_sessions_expires_at_idx").on(table.expiresAt),
  })
);

export type AuthSession = InferSelectModel<typeof authSessions>;
