import { signRequest } from "@worldcoin/idkit-core/signing";
import cookieParser from "cookie-parser";
import express, { type Request, type Response } from "express";
import {
  cancelHandover, consumeChallenge, createChallenge, createPromise, currentPerson,
  getPromise, joinPromise, listPromises, loginByNullifier, loginBySession, logout, transition,
} from "./store.js";

const cookieName = "bfa_session";
const routeId = (request: Request) => {
  const value = request.params.id;
  return Array.isArray(value) ? value[0]! : value!;
};
const asyncRoute = (handler: (request: Request, response: Response) => Promise<unknown>) =>
  (request: Request, response: Response, next: (error?: unknown) => void) => void handler(request, response).catch(next);

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => response.json({ ok: true }));

  app.post("/api/rp-signature", asyncRoute(async (request, response) => {
    const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
    const rpId = process.env.WORLD_RP_ID;
    if (!signingKeyHex || !rpId) return response.status(500).json({ error: "World ID configuration is missing" });
    const action = typeof request.body?.action === "string" && request.body.action ? request.body.action : undefined;
    const signed = signRequest(action ? { signingKeyHex, action } : { signingKeyHex });
    await createChallenge(signed.nonce, action ?? "", signed.expiresAt);
    return response.json({ rp_id: rpId, sig: signed.sig, nonce: signed.nonce, created_at: signed.createdAt, expires_at: signed.expiresAt, action });
  }));

  app.post("/api/verify-proof", asyncRoute(async (request, response) => {
    const proof = request.body?.idkitResponse;
    if (!proof || typeof proof.nonce !== "string") return response.status(400).json({ error: "Invalid proof context" });
    const rpId = process.env.WORLD_RP_ID;
    if (!rpId) return response.status(500).json({ error: "World ID configuration is missing" });

    const worldResponse = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proof),
    });
    const result = await worldResponse.json().catch(() => ({})) as Record<string, unknown>;
    const expectedEnvironment = process.env.WORLD_ENV ?? "staging";
    if (!worldResponse.ok || result.success !== true || result.environment !== expectedEnvironment) {
      return response.status(400).json({ error: result.error ?? result.detail ?? "World ID verification failed" });
    }
    if (request.body?.requireUserPresence === true && proof.user_presence_completed !== true) return response.status(400).json({ error: "Live check incomplete" });
    if (!await consumeChallenge(proof.nonce, typeof proof.action === "string" ? proof.action : "")) return response.status(409).json({ error: "Proof request expired or already used" });

    const sessionId = proof.session_id ?? result.session_id;
    let token: string;
    if (typeof sessionId === "string") {
      token = await loginBySession(sessionId);
    } else {
      const nestedResults = Array.isArray(result.results) ? result.results as Array<Record<string, unknown>> : [];
      const nullifier = result.nullifier ?? nestedResults.find((entry) => entry.identifier === "proof_of_human" && entry.success === true)?.nullifier;
      if (typeof nullifier !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(nullifier)) return response.status(400).json({ error: "No verified identity was returned" });
      token = await loginByNullifier(BigInt(nullifier).toString(10));
    }

    response.cookie(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86_400_000 });
    return response.json({ success: true });
  }));

  app.get("/api/session", asyncRoute(async (request, response) => response.json({ authenticated: Boolean(await currentPerson(request.cookies[cookieName])) })));
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

  app.use((error: unknown, _request: Request, response: Response, _next: (error?: unknown) => void) => {
    console.error(error);
    response.status(500).json({ error: "Unexpected server error" });
  });
  return app;
}
