import { signRequest } from "@worldcoin/idkit-core/signing";
import cookieParser from "cookie-parser";
import express, { type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import {
  bindWorldSession, cancelHandover, consumeChallenge, createChallenge, createPromise, createShowUpPromise, currentPerson, ensureLoginHandle,
  findWorldSession, getPromise, joinPromise, listPromises, loginByBoundSession, logout, registerByNullifier, transition,
} from "./store.js";

const cookieName = "bfa_session";
const registrationAction = "borrow-from-a-human-register";
const routeId = (request: Request) => {
  const value = request.params.id;
  return Array.isArray(value) ? value[0]! : value!;
};
const asyncRoute = (handler: (request: Request, response: Response) => Promise<unknown>) =>
  (request: Request, response: Response, next: (error?: unknown) => void) => void handler(request, response).catch(next);

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

  app.post("/api/rp-signature", asyncRoute(async (request, response) => {
    const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
    const rpId = process.env.WORLD_RP_ID;
    if (!signingKeyHex || !rpId) return response.status(500).json({ error: "World ID configuration is missing" });
    const requestedAction = typeof request.body?.action === "string" && request.body.action ? request.body.action : undefined;
    if (requestedAction && requestedAction !== registrationAction) return response.status(400).json({ error: "Unknown World ID action" });
    const action = requestedAction;
    const signed = signRequest(action ? { signingKeyHex, action } : { signingKeyHex });
    await createChallenge(signed.nonce, action ?? "", signed.expiresAt);
    console.info(JSON.stringify({ scope: "world-id", requestId: response.locals.requestId, stage: "challenge_created", environment: process.env.WORLD_ENV ?? "staging" }));
    return response.json({ rp_id: rpId, sig: signed.sig, nonce: signed.nonce, created_at: signed.createdAt, expires_at: signed.expiresAt, action });
  }));

  app.post("/api/auth/login-context", asyncRoute(async (request, response) => {
    const loginHandle = typeof request.body?.loginHandle === "string" ? request.body.loginHandle.trim() : "";
    if (!/^[A-Za-z0-9_-]{32}$/.test(loginHandle)) return response.status(400).json({ error: "Enter a valid account recovery key" });
    const sessionId = await findWorldSession(loginHandle);
    return sessionId ? response.json({ sessionId }) : response.status(404).json({ error: "Account not found" });
  }));

  app.post("/api/verify-proof", asyncRoute(async (request, response) => {
    const proof = request.body?.idkitResponse;
    if (!proof || typeof proof.nonce !== "string") return response.status(400).json({ error: "Invalid proof context" });
    const rpId = process.env.WORLD_RP_ID;
    if (!rpId) return response.status(500).json({ error: "World ID configuration is missing" });

    console.info(JSON.stringify({ scope: "world-id", requestId: response.locals.requestId, stage: "proof_received" }));
    let worldResponse: globalThis.Response;
    try {
      worldResponse = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(proof),
      });
    } catch (error) {
      console.error(JSON.stringify({ scope: "world-id", requestId: response.locals.requestId, stage: "upstream_unreachable", error: error instanceof Error ? error.name : "UnknownError" }));
      return response.status(502).json({ error: "Could not reach World ID verification service" });
    }
    const result = await worldResponse.json().catch(() => ({})) as Record<string, unknown>;
    const expectedEnvironment = process.env.WORLD_ENV ?? "staging";
    console.info(JSON.stringify({ scope: "world-id", requestId: response.locals.requestId, stage: "upstream_response", status: worldResponse.status, success: result.success === true, code: typeof result.error === "string" ? result.error : undefined }));
    if (!worldResponse.ok || result.success !== true || result.environment !== expectedEnvironment) {
      return response.status(400).json({ error: result.error ?? result.detail ?? "World ID verification failed" });
    }
    if (request.body?.requireUserPresence === true && proof.user_presence_completed !== true) return response.status(400).json({ error: "Live check incomplete" });
    if (!await consumeChallenge(proof.nonce, typeof proof.action === "string" ? proof.action : "")) return response.status(409).json({ error: "Proof request expired or already used" });

    const proofAction = typeof proof.action === "string" ? proof.action : "";
    const sessionId = proof.session_id ?? result.session_id;
    let token: string | null;
    let loginHandle: string | undefined;
    if (typeof sessionId === "string") {
      const personId = await currentPerson(request.cookies[cookieName]);
      if (personId) {
        loginHandle = (await bindWorldSession(personId, sessionId)) ?? undefined;
        if (!loginHandle) return response.status(409).json({ error: "This World Session cannot be bound to this account" });
        token = request.cookies[cookieName];
      } else {
        token = await loginByBoundSession(sessionId);
        if (!token) return response.status(401).json({ error: "This World Session is not registered" });
      }
    } else {
      if (proofAction !== registrationAction) return response.status(400).json({ error: "Registration requires the fixed uniqueness action" });
      const nestedResults = Array.isArray(result.results) ? result.results as Array<Record<string, unknown>> : [];
      const nullifier = result.nullifier ?? nestedResults.find((entry) => entry.identifier === "proof_of_human" && entry.success === true)?.nullifier;
      if (typeof nullifier !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(nullifier)) return response.status(400).json({ error: "No verified identity was returned" });
      const registration = await registerByNullifier(BigInt(nullifier).toString(10));
      token = registration.token;
    }

    response.cookie(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86_400_000 });
    return response.json({ success: true, ...(loginHandle ? { loginHandle } : {}) });
  }));

  app.get("/api/session", asyncRoute(async (request, response) => {
    const personId = await currentPerson(request.cookies[cookieName]);
    if (!personId) return response.json({ authenticated: false });
    const loginHandle = await ensureLoginHandle(personId);
    return response.json({ authenticated: true, ...(loginHandle ? { loginHandle } : {}) });
  }));

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/debug/world-id", (_request, response) => response.json({
      appIdConfigured: Boolean(process.env.VITE_WORLD_APP_ID),
      appIdSuffix: process.env.VITE_WORLD_APP_ID?.slice(-4),
      rpIdConfigured: Boolean(process.env.WORLD_RP_ID),
      rpIdSuffix: process.env.WORLD_RP_ID?.slice(-4),
      signingKeyConfigured: Boolean(process.env.WORLD_RP_SIGNING_KEY),
      clientEnvironment: process.env.VITE_WORLD_ENV ?? null,
      serverEnvironment: process.env.WORLD_ENV ?? null,
    }));
  }
  app.delete("/api/session", asyncRoute(async (request, response) => {
    await logout(request.cookies[cookieName]);
    response.clearCookie(cookieName, { path: "/" });
    return response.json({ success: true });
  }));

  app.get("/api/promises", asyncRoute(async (request, response) => {
    const person = await currentPerson(request.cookies[cookieName]);
    return person ? response.json(await listPromises(person)) : response.status(401).json({ error: "Sign in first" });
  }));
  app.post("/api/promises", asyncRoute(async (request, response) => {
    const person = await currentPerson(request.cookies[cookieName]);
    if (!person) return response.status(401).json({ error: "Sign in first" });
    const { item, deadline, note = "" } = request.body ?? {};
    if (typeof item !== "string" || !item.trim() || item.trim().length > 80 || typeof deadline !== "string" || !Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) <= Date.now() || typeof note !== "string" || note.length > 240) return response.status(400).json({ error: "Enter an item, a future deadline, and a note under 240 characters" });
    return response.status(201).json(await createPromise(person, item.trim(), new Date(deadline).toISOString(), note.trim()));
  }));

  app.post("/api/promises/show-up", asyncRoute(async (request, response) => {
    const person = await currentPerson(request.cookies[cookieName]);
    if (!person) return response.status(401).json({ error: "Sign in first" });
    const { latitude, longitude, scheduledAt, centerTime, windowHours, timezone, note = "" } = request.body ?? {};
    const validCoordinates = typeof latitude === "number" && latitude >= -90 && latitude <= 90 && typeof longitude === "number" && longitude >= -180 && longitude <= 180;
    const validSchedule = typeof scheduledAt === "string" && Number.isFinite(Date.parse(scheduledAt)) && Date.parse(scheduledAt) > Date.now();
    const validTime = typeof centerTime === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(centerTime);
    const validWindow = typeof windowHours === "number" && Number.isFinite(windowHours) && windowHours >= 0.5 && windowHours <= 12;
    const validTimezone = typeof timezone === "string" && /^[A-Za-z0-9_+\-/]{1,64}$/.test(timezone);
    if (!validCoordinates || !validSchedule || !validTime || !validWindow || !validTimezone || typeof note !== "string" || note.length > 240) {
      return response.status(400).json({ error: "Choose a valid area, future time, time window, and note under 240 characters" });
    }
    return response.status(201).json(await createShowUpPromise(person, new Date(scheduledAt).toISOString(), note.trim(), {
      latitude,
      longitude,
      radiusMeters: 500,
      centerTime,
      windowHours,
      timezone,
    }));
  }));

  app.get("/api/promises/:id", asyncRoute(async (request, response) => {
    const promise = await getPromise(routeId(request), await currentPerson(request.cookies[cookieName]));
    return promise ? response.json(promise) : response.status(404).json({ error: "Promise not found" });
  }));

  const actions = [
    ["lend", async (id: string, person: string) => joinPromise(id, person), "Request unavailable or this is your own request"],
    ["receive", async (id: string, person: string) => transition(id, "HANDOVER_PENDING", "ACTIVE", person, "borrower"), "Only the borrower can confirm receipt"],
    ["request-return", async (id: string, person: string) => transition(id, "ACTIVE", "RETURN_REQUESTED", person, "borrower"), "Only the borrower can request return"],
    ["cancel-return", async (id: string, person: string) => transition(id, "RETURN_REQUESTED", "ACTIVE", person, "borrower"), "Only the borrower can cancel return"],
    ["confirm", async (id: string, person: string) => transition(id, "RETURN_REQUESTED", "FULFILLED", person, "lender"), "Only the lender can confirm return"],
    ["cancel-handover", cancelHandover, "Only the lender can cancel handover"],
  ] as const;
  for (const [action, operation, error] of actions) {
    app.post(`/api/promises/:id/${action}`, asyncRoute(async (request, response) => {
      const person = await currentPerson(request.cookies[cookieName]);
      if (!person) return response.status(401).json({ error: "Sign in first" });
      return await operation(routeId(request), person) ? response.json({ success: true }) : response.status(409).json({ error });
    }));
  }

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
      response.setHeader("Cache-Control", "no-cache");
      return response.sendFile(resolve(distPath, "index.html"));
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: (error?: unknown) => void) => {
    console.error(JSON.stringify({ scope: "api", requestId: response.locals.requestId, stage: "unhandled_error", error: error instanceof Error ? error.message : String(error) }));
    response.status(500).json({ error: "Unexpected server error", requestId: response.locals.requestId });
  });
  return app;
}
