import "dotenv/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const production = process.env.NODE_ENV === "production";
const vitePort = Number(process.env.VITE_INTERNAL_PORT ?? 5173);
const frontendProxy = production ? null : createProxyMiddleware({
  target: `http://127.0.0.1:${vitePort}`,
  changeOrigin: true,
  ws: true,
  xfwd: true,
});
const app = createApp(production ? { mode: "production" } : { mode: "development", proxy: frontendProxy! });
const server = app.listen(port, () => console.log(`Borrow From A Human listening on http://localhost:${port} (${production ? "production" : "Vite proxy"})`));

if (frontendProxy) server.on("upgrade", frontendProxy.upgrade);
