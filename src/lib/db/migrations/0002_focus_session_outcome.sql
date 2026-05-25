ALTER TABLE "focus_sessions" ADD COLUMN IF NOT EXISTS "task_id" integer;
ALTER TABLE "focus_sessions" ADD COLUMN IF NOT EXISTS "outcome" varchar(32) DEFAULT 'completed' NOT NULL;
