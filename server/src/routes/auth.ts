import { Router } from "express";
import { signRequest } from "@worldcoin/idkit-core/signing";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { consumeChallenge, createChallenge, loginByNullifier, loginByOidcSub, loginByWorldSession } from "../store.js";
import { asyncRoute, cookieName } from "../middleware/require-auth.js";

const registrationAction = "borrow-from-a-human-register";

export const authRouter = Router();

authRouter.post("/api/rp-signature", asyncRoute(async (request, response) => {
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

authRouter.post("/api/verify-proof", asyncRoute(async (request, response) => {
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
  if (!await consumeChallenge(proof.nonce, typeof proof.action === "string" ? proof.action : "")) return response.status(409).json({ error: "Proof request expired or already used" });

  const sessionId = proof.session_id ?? result.session_id;
  let token: string;
  if (typeof sessionId === "string") {
    token = await loginByWorldSession(sessionId);
  } else {
    const proofAction = typeof proof.action === "string" ? proof.action : "";
    if (proofAction !== registrationAction) return response.status(400).json({ error: "No verified World ID identity was returned" });
    const nestedResults = Array.isArray(result.results) ? result.results as Array<Record<string, unknown>> : [];
    const nullifier = result.nullifier ?? nestedResults.find((entry) => entry.identifier === "proof_of_human" && entry.success === true)?.nullifier;
    if (typeof nullifier !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(nullifier)) return response.status(400).json({ error: "No verified identity was returned" });
    token = await loginByNullifier(BigInt(nullifier).toString(10));
  }

  response.cookie(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86_400_000 });
  return response.json({ success: true });
}));

authRouter.get("/api/auth/world-id", asyncRoute(async (request, response) => {
  const clientId = process.env.WORLD_AUTH_CLIENT_ID;
  const issuer = process.env.WORLD_AUTH_ISSUER ?? "https://sandbox.auth.world.org";
  const proto = request.get("x-forwarded-proto") ?? request.protocol;
  const host = request.get("x-forwarded-host") ?? request.get("host");
  const defaultRedirect = `${proto}://${host}/auth/callback`;
  const redirectUri = process.env.WORLD_AUTH_REDIRECT_URI ?? defaultRedirect;

  if (!clientId) return response.status(500).json({ error: "WORLD_AUTH_CLIENT_ID is not configured" });

  const state = randomBytes(16).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  response.cookie("bfa_oidc_state", JSON.stringify({ state, nonce, codeVerifier, redirectUri }), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https" || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60 * 1000,
  });

  const authUrl = new URL(`${issuer}/api/v1/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  if (request.query.format === "json" || request.xhr) {
    return response.json({ url: authUrl.toString() });
  }
  return response.redirect(authUrl.toString());
}));

const handleOidcCallback = asyncRoute(async (request, response) => {
  const { code, state, error, error_description } = request.query;
  if (error) {
    console.error(JSON.stringify({ scope: "world-auth", stage: "callback_error", error, error_description }));
    return response.redirect(`/?auth_error=${encodeURIComponent(String(error_description || error))}`);
  }
  if (typeof code !== "string" || typeof state !== "string") {
    return response.redirect("/?auth_error=missing_code_or_state");
  }

  const savedCookie = request.cookies?.bfa_oidc_state;
  let saved: { state: string; nonce: string; codeVerifier: string; redirectUri: string } | null = null;
  try {
    saved = savedCookie ? JSON.parse(savedCookie) : null;
  } catch {
    saved = null;
  }

  if (!saved || saved.state !== state) {
    console.error(JSON.stringify({ scope: "world-auth", stage: "state_mismatch", received: state, expected: saved?.state }));
    return response.redirect("/?auth_error=invalid_state");
  }

  const clientId = process.env.WORLD_AUTH_CLIENT_ID;
  const clientSecret = process.env.WORLD_AUTH_CLIENT_SECRET;
  const issuer = process.env.WORLD_AUTH_ISSUER ?? "https://sandbox.auth.world.org";
  const redirectUri = saved.redirectUri;

  if (!clientId || !clientSecret) return response.status(500).json({ error: "World Auth credentials missing" });

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: saved.codeVerifier,
  });

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let tokenRes: globalThis.Response;
  try {
    tokenRes = await fetch(`${issuer}/api/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: tokenParams.toString(),
    });
  } catch (err) {
    console.error(JSON.stringify({ scope: "world-auth", stage: "token_endpoint_unreachable", error: String(err) }));
    return response.redirect("/?auth_error=token_endpoint_unreachable");
  }

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => "");
    console.error(JSON.stringify({ scope: "world-auth", stage: "token_exchange_failed", status: tokenRes.status, body: errBody }));
    return response.redirect("/?auth_error=token_exchange_failed");
  }

  const tokenData = await tokenRes.json().catch(() => ({})) as { id_token?: string; access_token?: string };
  if (!tokenData.id_token) return response.redirect("/?auth_error=missing_id_token");

  const JWKS = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  let payload: { sub?: string; nonce?: string };
  try {
    const verified = await jwtVerify(tokenData.id_token, JWKS, { issuer, audience: clientId });
    payload = verified.payload;
  } catch (err) {
    console.error(JSON.stringify({ scope: "world-auth", stage: "jwt_verification_failed", error: String(err) }));
    return response.redirect("/?auth_error=invalid_id_token");
  }

  if (saved.nonce && payload.nonce !== saved.nonce) {
    console.error(JSON.stringify({ scope: "world-auth", stage: "nonce_mismatch" }));
    return response.redirect("/?auth_error=nonce_mismatch");
  }

  if (!payload.sub) return response.redirect("/?auth_error=missing_sub");

  const sessionToken = await loginByOidcSub(payload.sub);
  const proto = request.get("x-forwarded-proto") ?? request.protocol;
  response.cookie(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https" || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86_400_000,
  });
  response.clearCookie("bfa_oidc_state", { path: "/" });

  return response.redirect("/");
});

authRouter.get("/auth/callback", handleOidcCallback);
authRouter.get("/api/auth/callback", handleOidcCallback);
