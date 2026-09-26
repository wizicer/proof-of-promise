import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { getPromise } from "./store.js";

const promiseIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const handler = createMcpHandler(({ requestInfo }) => {
  const promiseId = requestInfo ? new URL(requestInfo.url).searchParams.get("promiseId") ?? "" : "";
  const server = new McpServer({ name: "proof-of-promise", version: "1.0.0" });

  server.registerTool(
    "verify_promise",
    {
      title: "Verify Promise",
      description: "Check whether the Promise of Show Up bound to this MCP endpoint is verified.",
      inputSchema: z.object({}),
      outputSchema: z.object({ verified: z.boolean() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const promise = promiseIdPattern.test(promiseId) ? await getPromise(promiseId) : null;
      const output = {
        verified: Boolean(
          promise
          && promise.kind === "SHOW_UP"
          && promise.status === "COMMITTED"
          && promise.borrowerVerified,
        ),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );

  return server;
});

export const mcpRequestHandler = toNodeHandler(handler, {
  maxRequestBodySize: 32 * 1024,
  onerror: (error) => console.error(JSON.stringify({ scope: "mcp", stage: "handler_error", error: error.message })),
});
