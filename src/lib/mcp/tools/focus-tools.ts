import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getTasks, createTask, updateTask, deleteTask } from "@/lib/db/queries";
import { getFocusSessions, getUserStats, upsertUserStats, createFocusSession } from "@/lib/db/queries";

export function registerFocusTools(server: McpServer, userId: string) {
  // ─── Get task list ───────────────────────────────────────────────────────
  server.registerTool(
    "list_tasks",
    {
      description: "List all tasks in the user's focus schedule, organized by Eisenhower quadrant.",
      inputSchema: {},
    },
    async () => {
      const tasks = await getTasks(userId);
      const grouped = {
        A_重要且紧急: tasks.filter((t) => t.category === "import-urgent"),
        B_重要不紧急: tasks.filter((t) => t.category === "import-noturgent"),
        C_不重要紧急: tasks.filter((t) => t.category === "notimport-urgent"),
        D_不重要不紧急: tasks.filter((t) => t.category === "notimport-noturgent"),
      };
      return { content: [{ type: "text" as const, text: JSON.stringify({ total: tasks.length, grouped }, null, 2) }] };
    }
  );

  // ─── Add task ────────────────────────────────────────────────────────────
  server.registerTool(
    "add_task",
    {
      description: "Add a new task to the focus schedule.",
      inputSchema: {
        text: z.string().min(1).describe("Task description"),
        category: z.enum(["import-urgent", "import-noturgent", "notimport-urgent", "notimport-noturgent"]).default("import-urgent").describe("Eisenhower quadrant"),
        durationMinutes: z.number().int().min(5).max(120).default(25).describe("Estimated minutes to complete the task"),
      },
    },
    async ({ text, category, durationMinutes }) => {
      const task = await createTask(userId, text, category, durationMinutes);
      return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
    }
  );

  // ─── Complete task ───────────────────────────────────────────────────────
  server.registerTool(
    "complete_task",
    {
      description: "Mark a task as completed.",
      inputSchema: {
        taskId: z.number().int().positive().describe("Task ID to mark as done"),
      },
    },
    async ({ taskId }) => {
      const updated = await updateTask(taskId, userId, { checked: true });
      if (!updated) return { isError: true, content: [{ type: "text" as const, text: `Task ${taskId} not found.` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(updated, null, 2) }] };
    }
  );

  // ─── Delete task ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_task",
    {
      description: "Delete a task from the schedule.",
      inputSchema: {
        taskId: z.number().int().positive().describe("Task ID to delete"),
      },
    },
    async ({ taskId }) => {
      const ok = await deleteTask(taskId, userId);
      return { content: [{ type: "text" as const, text: ok ? "Task deleted." : "Task not found." }] };
    }
  );

  // ─── Get focus history ───────────────────────────────────────────────────
  server.registerTool(
    "get_focus_history",
    {
      description: "Get the user's recent focus session history.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(10).describe("Number of sessions to retrieve"),
      },
    },
    async ({ limit }) => {
      const sessions = await getFocusSessions(userId, limit);
      return { content: [{ type: "text" as const, text: JSON.stringify(sessions, null, 2) }] };
    }
  );

  // ─── Get focus stats ─────────────────────────────────────────────────────
  server.registerTool(
    "get_focus_stats",
    {
      description: "Get the user's overall focus statistics: total sessions, coins, streak.",
      inputSchema: {},
    },
    async () => {
      const stats = await getUserStats(userId);
      return { content: [{ type: "text" as const, text: JSON.stringify(stats ?? { totalCoins: 0, consecutiveDays: 0, totalSessions: 0 }, null, 2) }] };
    }
  );

  // ─── Log completed session ───────────────────────────────────────────────
  server.registerTool(
    "log_focus_session",
    {
      description: "Record a completed 25-minute focus session and earn coins.",
      inputSchema: {
        officerId: z.enum(["yuri", "gu", "lin"]).default("yuri").describe("Supervising officer ID"),
        distractionCount: z.number().int().min(0).default(0).describe("Number of times the user got distracted"),
      },
    },
    async ({ officerId, distractionCount }) => {
      const session = await createFocusSession(userId, officerId, distractionCount);
      const stats = await upsertUserStats(userId, 15);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ session, updatedStats: stats, message: "专注轮次记录成功！获得 15 个专注币" }, null, 2),
        }],
      };
    }
  );
}
