ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "deadline" timestamp;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_start_at" timestamp;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_end_at" timestamp;
