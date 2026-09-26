import cookieParser from "cookie-parser";
import express, { type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import { authRouter } from "./routes/auth.js";
import { sessionRouter } from "./routes/session.js";
import { promisesRouter } from "./routes/promises.js";
import { merchantRouter } from "./routes/merchant.js";
import { mcpRequestHandler } from "./mcp.js";

type FrontendOptions =
  | { mode?: "none" }
  | { mode: "development"; proxy: RequestHandler }
  | { mode: "production"; distPath?: string };

export function createApp(frontend: FrontendOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    const incoming = request.get("x-request-id");
    const requestId = incoming && /^[a-zA-Z0-9_-]{8,80}$/.test(incoming) ? incoming : randomUUID();
    response.locals.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    if (request.path.startsWith("/api/")) {
      response.setHeader("Cache-Control", "no-store");
      const started = performance.now();
      response.on("finish", () => console.info(JSON.stringify({
        scope: "api",
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      })));
    }
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => response.json({ ok: true }));

  app.all("/mcp", (request, response) => void mcpRequestHandler(request, response, request.body));

  app.use(authRouter);
  app.use(sessionRouter);
  app.use(promisesRouter);
  app.use(merchantRouter);

  app.use("/api", (_request, response) => response.status(404).json({ error: "API route not found" }));

  if (frontend.mode === "development") app.use(frontend.proxy);

  if (frontend.mode === "production") {
    const defaultDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../ui/dist");
    const distPath = frontend.distPath ?? defaultDist;
    if (!existsSync(resolve(distPath, "index.html"))) throw new Error(`UI build not found at ${distPath}. Run npm run build first.`);
    app.use(express.static(distPath, {
      index: false,
      setHeaders(response, filePath) {
        if (filePath.includes(`${resolve(distPath, "assets")}/`)) response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    }));
    app.use((request, response, next) => {
      if (request.method !== "GET" || !request.accepts("html")) return next();
      response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.setHeader("Pragma", "no-cache");
      response.setHeader("Expires", "0");
      return response.sendFile(resolve(distPath, "index.html"));
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: (error?: unknown) => void) => {
    console.error(JSON.stringify({ scope: "api", requestId: response.locals.requestId, stage: "unhandled_error", error: error instanceof Error ? error.message : String(error) }));
    response.status(500).json({ error: "Unexpected server error", requestId: response.locals.requestId });
  });
  return app;
}
