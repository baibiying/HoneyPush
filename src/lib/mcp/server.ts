import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFocusTools } from "./tools/focus-tools";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "focus-bureau",
    version: "1.0.0",
  });

  registerFocusTools(server, userId);

  return server;
}
