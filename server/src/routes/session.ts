import { Router } from "express";
import { currentPerson, logout } from "../store.js";
import { asyncRoute, cookieName } from "../middleware/require-auth.js";

export const sessionRouter = Router();

sessionRouter.get("/api/session", asyncRoute(async (request, response) => response.json({ authenticated: Boolean(await currentPerson(request.cookies[cookieName])) })));

if (process.env.NODE_ENV !== "production") {
  sessionRouter.get("/api/debug/world-id", (_request, response) => response.json({
    appIdConfigured: Boolean(process.env.VITE_WORLD_APP_ID),
    appIdSuffix: process.env.VITE_WORLD_APP_ID?.slice(-4),
    rpIdConfigured: Boolean(process.env.WORLD_RP_ID),
    rpIdSuffix: process.env.WORLD_RP_ID?.slice(-4),
    signingKeyConfigured: Boolean(process.env.WORLD_RP_SIGNING_KEY),
    clientEnvironment: process.env.VITE_WORLD_ENV ?? null,
    serverEnvironment: process.env.WORLD_ENV ?? null,
  }));
}

sessionRouter.delete("/api/session", asyncRoute(async (request, response) => {
  await logout(request.cookies[cookieName]);
  response.clearCookie(cookieName, { path: "/" });
  return response.json({ success: true });
}));
