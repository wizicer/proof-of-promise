import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({
  path: [resolve(projectRoot, ".env.local"), resolve(projectRoot, ".env")],
  override: false,
  quiet: true,
});

const port = Number(process.env.PORT ?? 3000);
const production = process.env.NODE_ENV === "production";
const vitePort = Number(process.env.VITE_INTERNAL_PORT ?? 5173);
if (process.env.VITE_WORLD_ENV && process.env.WORLD_ENV && process.env.VITE_WORLD_ENV !== process.env.WORLD_ENV) {
  throw new Error(`World ID environment mismatch: UI=${process.env.VITE_WORLD_ENV}, server=${process.env.WORLD_ENV}`);
}
if (!production) {
  console.info(JSON.stringify({
    scope: "world-id",
    stage: "startup_config",
    appIdConfigured: Boolean(process.env.VITE_WORLD_APP_ID),
    rpIdConfigured: Boolean(process.env.WORLD_RP_ID),
    signingKeyConfigured: Boolean(process.env.WORLD_RP_SIGNING_KEY),
    clientEnvironment: process.env.VITE_WORLD_ENV ?? null,
    serverEnvironment: process.env.WORLD_ENV ?? null,
  }));
}
const frontendProxy = production ? null : createProxyMiddleware({
  target: `http://127.0.0.1:${vitePort}`,
  changeOrigin: true,
  ws: true,
  xfwd: true,
});
const app = createApp(production ? { mode: "production" } : { mode: "development", proxy: frontendProxy! });
const server = app.listen(port, () => console.log(`Borrow From A Human listening on http://localhost:${port} (${production ? "production" : "Vite proxy"})`));

if (frontendProxy) server.on("upgrade", frontendProxy.upgrade);
